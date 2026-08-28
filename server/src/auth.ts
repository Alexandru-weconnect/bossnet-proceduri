import { createHash, randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { config } from "./config.js";
import { pool, query, withTransaction } from "./db.js";
import type { SessionUser } from "./types.js";

const googlePayloadSchema = z.object({
  idToken: z.string().min(100),
  nonce: z.string().min(16).max(256),
});

const mockPayloadSchema = z.object({
  email: z.string().email().transform((email) => email.toLowerCase()),
});

interface UserRow {
  email: string;
  google_subject: string | null;
  id: string;
  display_name: string;
  system_role: "admin" | "editor";
}

interface SessionRow extends UserRow {
  expires_at: Date;
}

const oauthClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function publicUser(row: UserRow): SessionUser {
  return {
    email: row.email,
    id: row.id,
    name: row.display_name,
    systemRole: row.system_role,
  };
}

async function issueSession(user: UserRow) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);

  const result = await query<{ expires_at: Date }>(
    `insert into bossnet.auth_sessions (token_hash, user_id, expires_at)
     values ($1, $2, now() + ($3::text || ' hours')::interval)
     returning expires_at`,
    [tokenHash, user.id, config.sessionHours],
  );

  const expiresAt = result.rows[0]?.expires_at;
  if (!expiresAt) throw new Error("Sesiunea nu a putut fi creată");

  return {
    expiresAt: expiresAt.toISOString(),
    token,
    user: publicUser(user),
  };
}

export async function authenticateGoogle(body: unknown) {
  if (!oauthClient || !config.googleClientId) {
    return { error: "Google OAuth nu este configurat pe server", status: 503 } as const;
  }

  const parsed = googlePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return { error: "Răspuns Google invalid", status: 400 } as const;
  }

  let payload;
  try {
    const ticket = await oauthClient.verifyIdToken({
      audience: config.googleClientId,
      idToken: parsed.data.idToken,
    });
    payload = ticket.getPayload();
  } catch {
    return { error: "Identitatea Google nu a putut fi verificată", status: 401 } as const;
  }

  const email = payload?.email?.toLowerCase();
  if (
    !payload?.sub
    || !payload.email_verified
    || payload.hd?.toLowerCase() !== config.googleHostedDomain
    || payload.nonce !== parsed.data.nonce
    || !email?.endsWith(`@${config.googleHostedDomain}`)
  ) {
    return { error: "Acces permis numai organizației Bossnet", status: 403 } as const;
  }

  const user = await withTransaction(async (client) => {
    const result = await client.query<UserRow>(
      `select id::text, email, display_name, system_role, google_subject
       from bossnet.app_users
       where lower(email) = $1 and status = 'active'
       for update`,
      [email],
    );
    const row = result.rows[0];
    if (!row) return null;
    if (row.google_subject && row.google_subject !== payload.sub) return "identity-conflict" as const;

    await client.query(
      `update bossnet.app_users
       set google_subject = $1, last_login_at = now(), updated_at = now()
       where id = $2`,
      [payload.sub, row.id],
    );
    return { ...row, google_subject: payload.sub };
  });

  if (user === "identity-conflict") {
    return { error: "Contul Google nu corespunde identității înregistrate", status: 409 } as const;
  }
  if (!user) {
    return { error: "Utilizatorul nu este activ în directorul Bossnet", status: 403 } as const;
  }

  return { data: await issueSession(user), status: 200 } as const;
}

export async function authenticateMock(body: unknown) {
  if (!config.allowMockAuth) {
    return { error: "Autentificarea mock este dezactivată", status: 404 } as const;
  }

  const parsed = mockPayloadSchema.safeParse(body);
  if (!parsed.success || !parsed.data.email.endsWith(`@${config.googleHostedDomain}`)) {
    return { error: "Email Bossnet invalid", status: 400 } as const;
  }

  const result = await query<UserRow>(
    `select id::text, email, display_name, system_role, google_subject
     from bossnet.app_users
     where lower(email) = $1 and status = 'active'`,
    [parsed.data.email],
  );
  const user = result.rows[0];
  if (!user) {
    return { error: "Utilizatorul nu există în directorul Bossnet", status: 403 } as const;
  }

  return { data: await issueSession(user), status: 200 } as const;
}

export async function requireSession(request: FastifyRequest, reply: FastifyReply) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Sesiune necesară" });
  }

  const token = authorization.slice(7).trim();
  if (token.length < 32) {
    return reply.code(401).send({ error: "Sesiune invalidă" });
  }

  const result = await query<SessionRow>(
    `select
       u.id::text,
       u.email,
       u.display_name,
       u.system_role,
       u.google_subject,
       s.expires_at
     from bossnet.auth_sessions s
     join bossnet.app_users u on u.id = s.user_id
     where s.token_hash = $1
       and s.revoked_at is null
       and s.expires_at > now()
       and u.status = 'active'`,
    [hashToken(token)],
  );
  const session = result.rows[0];
  if (!session) {
    return reply.code(401).send({ error: "Sesiunea a expirat sau a fost revocată" });
  }

  request.bossnetUser = publicUser(session);
}

export async function revokeSession(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return;
  await query(
    `update bossnet.auth_sessions set revoked_at = now()
     where token_hash = $1 and revoked_at is null`,
    [hashToken(authorization.slice(7).trim())],
  );
}

export async function closeAuthPool() {
  await pool.end();
}
