export const dashboardResources = [
  { key: "vehicles", label: "Voertuigen", endpoint: "/api/vehicles", sessionRequired: true },
  { key: "buildings", label: "Gebouwen", endpoint: "/api/buildings", sessionRequired: true },
  { key: "allianceBuildings", label: "Teamgebouwen", endpoint: "/api/alliance_buildings", sessionRequired: true },
  { key: "credits", label: "Accountgegevens", endpoint: "/api/userinfo", sessionRequired: true },
  { key: "allianceInfo", label: "Teamgegevens", endpoint: "/api/allianceinfo", sessionRequired: true },
  { key: "schoolings", label: "Opleidingen", endpoint: "/api/schoolings", sessionRequired: true },
  { key: "allianceSchoolings", label: "Teamopleidingen", endpoint: "/api/alliance_schoolings", sessionRequired: true },
  { key: "pointsOfInterest", label: "POI's", endpoint: "/einsaetze.json", sessionRequired: false },
  { key: "missions", label: "Missies", endpoint: "/einsaetze.json", sessionRequired: false },
  { key: "allianceEvents", label: "Teamevents", endpoint: "/alliance_event_types.json", sessionRequired: false },
] as const;

export type DashboardResourceKey = (typeof dashboardResources)[number]["key"];

export type DashboardResourceResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export type DashboardData = Record<DashboardResourceKey, DashboardResourceResult>;

export const gameLocales = [
  "nl_NL", "de_DE", "en_AU", "en_US", "en_GB", "es_ES", "pl_PL", "sv_SE",
  "it_IT", "fr_FR", "ru_RU", "da_DK", "nb_NO", "cs_CZ", "tr_TR", "pt_PT",
  "pt_BR", "uk_UA", "ko_KR", "es_MX", "ja_JP", "ro_RO", "fi_FI", "sk_SK",
] as const;

export type ReferenceKey = "suggestions" | "missionUpdate" | `missions:${typeof gameLocales[number]}`;

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
  loadReference: (key: ReferenceKey) => Promise<DashboardResourceResult>;
  openExternal: (url: string) => Promise<void>;
  getAppInfo: () => Promise<AppInfo>;
  getUpdateStatus: () => Promise<UpdateStatus>;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateStatus: (listener: (status: UpdateStatus) => void) => () => void;
}
