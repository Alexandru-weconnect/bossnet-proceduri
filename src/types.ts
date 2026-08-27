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
}
