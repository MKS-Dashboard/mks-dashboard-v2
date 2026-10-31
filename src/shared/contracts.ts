export const dashboardResources = [
  { key: "vehicles", label: "Voertuigen", endpoint: "/api/vehicles", sessionRequired: true },
  { key: "buildings", label: "Gebouwen", endpoint: "/api/buildings", sessionRequired: true },
  { key: "allianceBuildings", label: "Teamgebouwen", endpoint: "/api/alliance_buildings", sessionRequired: true },
  { key: "credits", label: "Accountgegevens", endpoint: "/api/userinfo", sessionRequired: true },
  { key: "allianceInfo", label: "Teamgegevens", endpoint: "/api/allianceinfo", sessionRequired: true },
  { key: "schoolings", label: "Opleidingen", endpoint: "/api/schoolings", sessionRequired: true },
  { key: "allianceSchoolings", label: "Teamopleidingen", endpoint: "/api/alliance_schoolings", sessionRequired: true },
  { key: "pointsOfInterest", label: "POI's", endpoint: "/mission_positions", sessionRequired: true },
  { key: "missions", label: "Missies", endpoint: "/einsaetze.json", sessionRequired: false },
  { key: "allianceEvents", label: "Teammissies", endpoint: "/alliance_event_types.json", sessionRequired: false },
] as const;

export type DashboardResourceKey = (typeof dashboardResources)[number]["key"];

export type DashboardResourceResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export type DashboardData = Record<DashboardResourceKey, DashboardResourceResult>;

export interface AuthStatus {
  hasSessionId: boolean;
}

export type UpdateState =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "up-to-date"
  | "error";

export interface UpdateStatus {
  state: UpdateState;
  version?: string;
  percent?: number;
  message?: string;
}

export interface AppInfo {
  version: string;
  channel: "stable" | "dev";
}

export interface MksDashboardApi {
  getAuthStatus: () => Promise<AuthStatus>;
  setSessionId: (sessionId: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  loadDashboard: () => Promise<DashboardData>;
  getAppInfo: () => Promise<AppInfo>;
  getUpdateStatus: () => Promise<UpdateStatus>;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateStatus: (listener: (status: UpdateStatus) => void) => () => void;
}
