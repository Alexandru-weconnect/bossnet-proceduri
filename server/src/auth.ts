import { createHash, randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { config } from "./config.js";
import { pool, query, withTransaction } from "./db.js";
import type { SessionUser } from "./types.js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const PKCE_VERIFIER = /^[A-Za-z0-9._~-]+$/;

function isSafeLoopbackRedirect(value: string): boolean {
  try {
    const url = new URL(value);
    const port = Number(url.port);
    return url.protocol === "http:"
      && url.hostname === "127.0.0.1"
      && Number.isInteger(port)
      && port >= 1024
      && port <= 65535
      && url.pathname === "/"
      && !url.search
      && !url.hash
      && !url.username
      && !url.password;
  } catch {
    return false;
  }
}

const googleAuthorizationSchema = z.object({
  authorizationCode: z.string().min(16).max(4096),
  codeVerifier: z.string().min(43).max(128).regex(PKCE_VERIFIER),
  nonce: z.string().min(16).max(256),
  redirectUri: z.string().max(128).refine(isSafeLoopbackRedirect),
});

const googleTokenResponseSchema = z.object({
  error: z.string().optional(),
  id_token: z.string().min(100).optional(),
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

async function exchangeGoogleAuthorization(
  authorization: z.infer<typeof googleAuthorizationSchema>,
) {
  if (!config.googleClientId || !config.googleClientSecret) {
    return {
      error: "Google OAuth nu este configurat complet pe server",
      ok: false,
      status: 503,
    } as const;
  }

  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_URL, {
      body: new URLSearchParams({
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        code: authorization.authorizationCode,
        code_verifier: authorization.codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: authorization.redirectUri,
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return {
      error: "Google nu a răspuns la schimbul de autorizare",
      ok: false,
      status: 502,
    } as const;
  }

  const rawPayload: unknown = await response.json().catch(() => null);
  const tokenPayload = googleTokenResponseSchema.safeParse(rawPayload);
  if (!response.ok) {
    const googleError = tokenPayload.success ? tokenPayload.data.error : null;
    if (googleError === "invalid_grant") {
      return {
        error: "Codul Google a expirat sau a fost deja folosit. Reîncearcă autentificarea.",
        ok: false,
        status: 401,
      } as const;
    }
    if (googleError === "invalid_client") {
      return {
        error: "Configurația Google a serverului este invalidă",
        ok: false,
        status: 503,
      } as const;
    }
    return {
      error: "Google a refuzat schimbul de autorizare",
      ok: false,
      status: 502,
    } as const;
  }

  const idToken = tokenPayload.success ? tokenPayload.data.id_token : null;
  if (!idToken) {
    return {
      error: "Google nu a returnat identitatea utilizatorului",
      ok: false,
      status: 502,
    } as const;
  }
  return { idToken, ok: true } as const;
}

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
  if (!oauthClient || !config.googleClientId || !config.googleClientSecret) {
    return { error: "Google OAuth nu este configurat complet pe server", status: 503 } as const;
  }

  const parsed = googleAuthorizationSchema.safeParse(body);
  if (!parsed.success) {
    return { error: "Autorizația Google primită de la aplicație este invalidă", status: 400 } as const;
  }

  const exchange = await exchangeGoogleAuthorization(parsed.data);
  if (!exchange.ok) return { error: exchange.error, status: exchange.status } as const;

  let payload;
  try {
    const ticket = await oauthClient.verifyIdToken({
      audience: config.googleClientId,
      idToken: exchange.idToken,
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
