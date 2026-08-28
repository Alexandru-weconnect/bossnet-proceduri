import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { authenticateGoogle, authenticateMock, requireSession, revokeSession } from "./auth.js";
import { config } from "./config.js";
import { query } from "./db.js";
import type { SessionUser } from "./types.js";

interface UserDirectoryRow {
  department_names: string[] | null;
  direct_reports: string;
  email: string;
  hierarchy_level: number;
  id: string;
  job_title: string | null;
  manager_user_id: string | null;
  organizational_role: string | null;
  phone_e164: string | null;
  source_user_id: string;
  status: "active" | "inactive";
  system_role: "admin" | "editor";
  username: string;
  display_name: string;
}

interface DepartmentRow {
  id: string;
  manager_user_id: string | null;
  member_count: string;
  name: string;
  operational_supervisor_user_id: string | null;
  source_department_id: string;
}

interface MembershipRow {
  department_id: string;
  is_manager: boolean;
  role: string;
  user_id: string;
}

function userResponse(user: SessionUser | null) {
  if (!user) throw new Error("Sesiunea autentificată lipsește");
  return user;
}

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === "production" ? "info" : "debug",
      redact: ["req.headers.authorization", "req.body.idToken", "res.headers.authorization"],
    },
    trustProxy: true,
  });

  app.decorateRequest("bossnetUser", null);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 180, timeWindow: "1 minute" });
  await app.register(cors, {
    credentials: false,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    origin(origin, callback) {
      if (!origin || config.corsOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  });

  app.addHook("onRequest", async (request, reply) => {
    if (config.nodeEnv === "production" && request.protocol !== "https") {
      const location = new URL(request.raw.url ?? "/", config.publicOrigin).toString();
      return reply.code(308).header("Location", location).send();
    }
  });

  app.get("/v1/health", async (_request, reply) => {
    const result = await query<{ ok: number }>("select 1 as ok");
    return reply.send({ database: result.rows[0]?.ok === 1 ? "connected" : "unavailable", status: "ok" });
  });

  app.post(
    "/v1/auth/google",
    { config: { rateLimit: { max: 12, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const result = await authenticateGoogle(request.body);
      if ("error" in result) return reply.code(result.status).send({ error: result.error });
      return reply.code(result.status).send(result.data);
    },
  );

  app.post(
    "/v1/auth/mock",
    { config: { rateLimit: { max: 12, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const result = await authenticateMock(request.body);
      if ("error" in result) return reply.code(result.status).send({ error: result.error });
      return reply.code(result.status).send(result.data);
    },
  );

  app.get("/v1/session", { preHandler: requireSession }, async (request, reply) => {
    return reply.send({ user: userResponse(request.bossnetUser) });
  });

  app.delete("/v1/session", { preHandler: requireSession }, async (request, reply) => {
    await revokeSession(request);
    return reply.code(204).send();
  });

  app.get("/v1/organization", { preHandler: requireSession }, async (request, reply) => {
    const [usersResult, departmentsResult, membershipsResult] = await Promise.all([
      query<UserDirectoryRow>(
        `select
           u.id::text,
           u.source_user_id::text,
           u.username,
           u.display_name,
           u.job_title,
           u.email,
           u.phone_e164,
           u.system_role,
           u.status,
           u.hierarchy_level,
           u.organizational_role,
           u.manager_user_id::text,
           count(distinct report.id)::text as direct_reports,
           coalesce(array_agg(distinct d.name) filter (where d.id is not null), '{}') as department_names
         from bossnet.app_users u
         left join bossnet.app_users report on report.manager_user_id = u.id and report.status = 'active'
         left join bossnet.department_memberships dm on dm.user_id = u.id
         left join bossnet.departments d on d.id = dm.department_id
         where u.status = 'active'
         group by u.id
         order by u.hierarchy_level, u.display_name`,
      ),
      query<DepartmentRow>(
        `select
           d.id::text,
           d.source_department_id::text,
           d.name,
           d.manager_user_id::text,
           d.operational_supervisor_user_id::text,
           count(dm.user_id)::text as member_count
         from bossnet.departments d
         left join bossnet.department_memberships dm on dm.department_id = d.id
         group by d.id
         order by d.name`,
      ),
      query<MembershipRow>(
        `select department_id::text, user_id::text, role, is_manager
         from bossnet.department_memberships
         order by department_id, user_id`,
      ),
    ]);

    return reply.send({
      currentUser: userResponse(request.bossnetUser),
      departments: departmentsResult.rows.map((row) => ({
        id: row.id,
        managerId: row.manager_user_id,
        memberCount: Number(row.member_count),
        name: row.name,
        operationalSupervisorId: row.operational_supervisor_user_id,
        sourceId: row.source_department_id,
      })),
      memberships: membershipsResult.rows.map((row) => ({
        departmentId: row.department_id,
        isManager: row.is_manager,
        role: row.role,
        userId: row.user_id,
      })),
      users: usersResult.rows.map((row) => ({
        departmentNames: row.department_names ?? [],
        directReports: Number(row.direct_reports),
        email: row.email,
        hierarchyLevel: row.hierarchy_level,
        id: row.id,
        jobTitle: row.job_title,
        managerId: row.manager_user_id,
        name: row.display_name,
        organizationalRole: row.organizational_role,
        phone: row.phone_e164,
        sourceId: row.source_user_id,
        status: row.status,
        systemRole: row.system_role,
        username: row.username,
      })),
    });
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "Cerere API eșuată");
    if (reply.sent) return;
    const errorStatus =
      typeof error === "object"
      && error !== null
      && "statusCode" in error
      && typeof error.statusCode === "number"
        ? error.statusCode
        : 500;
    const statusCode = errorStatus >= 400 && errorStatus < 500 ? errorStatus : 500;
    reply.code(statusCode).send({
      error: statusCode < 500 && error instanceof Error ? error.message : "Eroare internă",
    });
  });

  return app;
}
