import type { AppearanceSettings, BossnetProject, BossnetSession } from "../types";

const SESSION_KEY = "bossnet:session:v2";
const PROJECTS_KEY = "bossnet:projects:v1";
const APPEARANCE_KEY = "bossnet:appearance:v1";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  overlayOpacity: 0.76,
  atmosphere: 0.78,
  overlayBlur: 20,
  showGrid: true,
  dimWhenInactive: false,
  alwaysOnTop: false,
  inAppNotifications: true,
  desktopNotifications: false,
  projectNotifications: true,
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

  if (
    !session
    || typeof session.email !== "string"
    || typeof session.expiresAt !== "number"
    || (session.authMode !== "google" && session.authMode !== "mock")
    || (session.systemRole !== "admin" && session.systemRole !== "editor")
    || (typeof session.token !== "string" && session.token !== null)
  ) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    clearSession();
    return null;
  }

  return session;
}

export function createMockSession(email: string): BossnetSession {
  const session: BossnetSession = {
    authMode: "mock",
    email: email.toLowerCase(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
    name: email.split("@")[0] ?? email,
    systemRole: "editor",
    token: null,
  };
  writeJson(SESSION_KEY, session);
  return session;
}

export function saveSession(session: BossnetSession): BossnetSession {
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
    overlayBlur:
      typeof settings?.overlayBlur === "number"
        ? Math.min(36, Math.max(0, settings.overlayBlur))
        : DEFAULT_APPEARANCE.overlayBlur,
    showGrid:
      typeof settings?.showGrid === "boolean"
        ? settings.showGrid
        : DEFAULT_APPEARANCE.showGrid,
    dimWhenInactive:
      typeof settings?.dimWhenInactive === "boolean"
        ? settings.dimWhenInactive
        : DEFAULT_APPEARANCE.dimWhenInactive,
    alwaysOnTop:
      typeof settings?.alwaysOnTop === "boolean"
        ? settings.alwaysOnTop
        : DEFAULT_APPEARANCE.alwaysOnTop,
    inAppNotifications:
      typeof settings?.inAppNotifications === "boolean"
        ? settings.inAppNotifications
        : DEFAULT_APPEARANCE.inAppNotifications,
    desktopNotifications:
      typeof settings?.desktopNotifications === "boolean"
        ? settings.desktopNotifications
        : DEFAULT_APPEARANCE.desktopNotifications,
    projectNotifications:
      typeof settings?.projectNotifications === "boolean"
        ? settings.projectNotifications
        : DEFAULT_APPEARANCE.projectNotifications,
  };
}

export function saveAppearance(settings: AppearanceSettings): void {
  writeJson(APPEARANCE_KEY, settings);
}
