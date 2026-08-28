import type { BossnetSession, OrganizationDirectory } from "../types";

interface ApiSessionResponse {
  expiresAt: string;
  token: string;
  user: {
    email: string;
    id: string;
    name: string;
    systemRole: "admin" | "editor";
  };
}

export interface GoogleAuthorization {
  authorizationCode: string;
  codeVerifier: string;
  nonce: string;
  redirectUri: string;
}

export const API_BASE_URL = (import.meta.env.VITE_BOSSNET_API_URL ?? "").replace(/\/$/, "");
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
export const MOCK_AUTH_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCK_AUTH === "true";

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  if (!API_BASE_URL) throw new Error("API-ul Bossnet nu este configurat în acest build.");

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  if (init.signal?.aborted) controller.abort();
  else init.signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 20_000);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new Error("Serverul Bossnet nu a răspuns în 20 de secunde. Verifică internetul și reîncearcă.");
    }
    if (init.signal?.aborted) throw error;
    throw new Error("API-ul Bossnet nu poate fi contactat. Verifică internetul și reîncearcă.");
  } finally {
    globalThis.clearTimeout(timeoutId);
    init.signal?.removeEventListener("abort", abortFromCaller);
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => ({ error: "Răspuns API invalid" })) as { error?: string };
  if (!response.ok) throw new Error(payload.error || `Eroare API ${response.status}`);
  return payload as T;
}

function toSession(response: ApiSessionResponse): BossnetSession {
  return {
    authMode: "google",
    email: response.user.email,
    expiresAt: new Date(response.expiresAt).getTime(),
    name: response.user.name,
    systemRole: response.user.systemRole,
    token: response.token,
  };
}

export async function authenticateWithGoogle(
  authorization: GoogleAuthorization,
): Promise<BossnetSession> {
  const response = await apiRequest<ApiSessionResponse>("/v1/auth/google", {
    body: JSON.stringify(authorization),
    method: "POST",
  });
  return toSession(response);
}

export async function validateServerSession(token: string): Promise<void> {
  await apiRequest<{ user: unknown }>("/v1/session", {}, token);
}

export async function endServerSession(token: string): Promise<void> {
  await apiRequest<void>("/v1/session", { method: "DELETE" }, token);
}

export async function readOrganization(token: string, signal?: AbortSignal): Promise<OrganizationDirectory> {
  return apiRequest<OrganizationDirectory>("/v1/organization", { signal }, token);
}
