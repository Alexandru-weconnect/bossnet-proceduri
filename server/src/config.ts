import { z } from "zod";

const environmentSchema = z.object({
  ALLOW_MOCK_AUTH: z.string().optional(),
  CORS_ORIGINS: z.string().default("http://localhost:1420,http://tauri.localhost,https://tauri.localhost"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL este obligatoriu"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_HOSTED_DOMAIN: z.string().default("bossnet.ro"),
  HOST: z.string().default("127.0.0.1"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  PUBLIC_ORIGIN: z.string().url().default("https://proceduri.teambossnet.ro"),
  SESSION_HOURS: z.coerce.number().int().min(1).max(168).default(24),
});

const parsed = environmentSchema.safeParse(process.env);

if (!parsed.success) {
  const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Configurație API invalidă: ${fields}`);
}

const environment = parsed.data;

export const config = {
  allowMockAuth:
    environment.NODE_ENV !== "production" && environment.ALLOW_MOCK_AUTH === "true",
  corsOrigins: new Set(
    environment.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
  databaseUrl: environment.DATABASE_URL,
  googleClientId: environment.GOOGLE_CLIENT_ID?.trim() || null,
  googleClientSecret: environment.GOOGLE_CLIENT_SECRET?.trim() || null,
  googleHostedDomain: environment.GOOGLE_HOSTED_DOMAIN.trim().toLowerCase(),
  host: environment.HOST,
  nodeEnv: environment.NODE_ENV,
  port: environment.PORT,
  publicOrigin: environment.PUBLIC_ORIGIN.replace(/\/$/, ""),
  sessionHours: environment.SESSION_HOURS,
};
