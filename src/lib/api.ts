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

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
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

export async function authenticateWithGoogle(idToken: string, nonce: string): Promise<BossnetSession> {
  const response = await apiRequest<ApiSessionResponse>("/v1/auth/google", {
    body: JSON.stringify({ idToken, nonce }),
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
