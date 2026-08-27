import type { AppearanceSettings, BossnetProject, BossnetSession } from "../types";

const SESSION_KEY = "bossnet:session:v1";
const PROJECTS_KEY = "bossnet:projects:v1";
const APPEARANCE_KEY = "bossnet:appearance:v1";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  overlayOpacity: 0.76,
  atmosphere: 0.78,
};

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The app remains usable if storage is disabled or full.
  }
}

export function readSession(): BossnetSession | null {
  const session = readJson<BossnetSession>(SESSION_KEY);

  if (!session || typeof session.email !== "string" || typeof session.expiresAt !== "number") {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    clearSession();
    return null;
  }

  return session;
}

export function createSession(email: string): BossnetSession {
  const session: BossnetSession = {
    email: email.toLowerCase(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  writeJson(SESSION_KEY, session);
  return session;
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // No-op when storage is unavailable.
  }
}

export function readProjects(): BossnetProject[] {
  const projects = readJson<BossnetProject[]>(PROJECTS_KEY);
  return Array.isArray(projects) ? projects : [];
}

export function saveProjects(projects: BossnetProject[]): void {
  writeJson(PROJECTS_KEY, projects);
}

export function readAppearance(): AppearanceSettings {
  const settings = readJson<Partial<AppearanceSettings>>(APPEARANCE_KEY);
  return {
    overlayOpacity:
      typeof settings?.overlayOpacity === "number"
        ? Math.min(0.94, Math.max(0.48, settings.overlayOpacity))
        : DEFAULT_APPEARANCE.overlayOpacity,
    atmosphere:
      typeof settings?.atmosphere === "number"
        ? Math.min(1, Math.max(0.2, settings.atmosphere))
        : DEFAULT_APPEARANCE.atmosphere,
  };
}

export function saveAppearance(settings: AppearanceSettings): void {
  writeJson(APPEARANCE_KEY, settings);
}
