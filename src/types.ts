export type ProjectRoute = "NEW" | "CLONE";

export type ProjectStatus = "DESCOPERIRE" | "PREVIEW" | "QA" | "SHOPIFY";

export interface BossnetSession {
  authMode: "google" | "mock";
  email: string;
  expiresAt: number;
  name: string;
  systemRole: "admin" | "editor";
  token: string | null;
}

export interface OrganizationUser {
  departmentNames: string[];
  directReports: number;
  email: string;
  hierarchyLevel: number;
  id: string;
  jobTitle: string | null;
  managerId: string | null;
  name: string;
  organizationalRole: string | null;
  phone: string | null;
  sourceId: string;
  status: "active" | "inactive";
  systemRole: "admin" | "editor";
  username: string;
}

export interface OrganizationDepartment {
  id: string;
  managerId: string | null;
  memberCount: number;
  name: string;
  operationalSupervisorId: string | null;
  sourceId: string;
}

export interface OrganizationMembership {
  departmentId: string;
  isManager: boolean;
  role: string;
  userId: string;
}

export interface OrganizationDirectory {
  currentUser: {
    email: string;
    id: string;
    name: string;
    systemRole: "admin" | "editor";
  };
  departments: OrganizationDepartment[];
  memberships: OrganizationMembership[];
  users: OrganizationUser[];
}

export interface BossnetProject {
  id: string;
  name: string;
  route: ProjectRoute;
  source: string;
  status: ProjectStatus;
  createdAt: number;
}

export type InterfaceFontSize = 10 | 12 | 14;

export interface AppearanceSettings {
  minimumFontSize: InterfaceFontSize;
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
