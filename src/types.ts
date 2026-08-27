export type ProjectRoute = "NEW" | "CLONE";

export type ProjectStatus = "DESCOPERIRE" | "PREVIEW" | "QA" | "SHOPIFY";

export interface BossnetSession {
  email: string;
  expiresAt: number;
}

export interface BossnetProject {
  id: string;
  name: string;
  route: ProjectRoute;
  source: string;
  status: ProjectStatus;
  createdAt: number;
}

export interface AppearanceSettings {
  overlayOpacity: number;
  atmosphere: number;
  overlayBlur: number;
  showGrid: boolean;
  dimWhenInactive: boolean;
  alwaysOnTop: boolean;
  inAppNotifications: boolean;
  desktopNotifications: boolean;
  projectNotifications: boolean;
}

export interface BossnetNotification {
  id: string;
  title: string;
  message: string;
  createdAt: number;
  tone: "info" | "success";
}
