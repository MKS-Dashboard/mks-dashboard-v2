import { dashboardResources, type AppInfo, type DashboardResourceKey } from "../../shared/contracts";
import { infoblocksAllowed, isInfoblockPage } from "./infoblocks";

export const extraPages = [
  { key: "progressdata", label: "Progressdata" },
  { key: "specializations", label: "Gebouwspecialisaties" },
  { key: "hospitals", label: "Eigen ziekenhuizen" },
  { key: "cells", label: "Eigen cellen" },
  { key: "teamHospitals", label: "Teamziekenhuizen" },
  { key: "teamCells", label: "Teamcellen" },
  { key: "creditComparison", label: "Credits per spelversie" },
  { key: "suggestions", label: "Suggesties" },
  { key: "plannedMissions", label: "Geplande missies" },
  { key: "seasonalEvents", label: "Evenementen" },
  { key: "largeAllianceMissions", label: "Grote teammissies" },
  { key: "awards", label: "Onderscheidingen" },
  { key: "information", label: "Informatie" },
] as const;

export type PageKey = "overview" | "settings" | "rawResponses" | typeof extraPages[number]["key"] | DashboardResourceKey;

export const navigationGroups: { label: string; pages: PageKey[] }[] = [
  { label: "Gebouwen", pages: ["buildings", "specializations", "hospitals", "cells", "schoolings"] },
  { label: "Team", pages: ["allianceInfo", "allianceBuildings", "teamHospitals", "teamCells", "allianceSchoolings"] },
  { label: "Informatie", pages: ["information", "awards", "pointsOfInterest", "largeAllianceMissions", "allianceEvents", "missions", "plannedMissions", "seasonalEvents"] },
];

export function pageAllowed(page: PageKey, signedIn: boolean, channel: AppInfo["channel"] | undefined,
  infoblocks: boolean, devMode: boolean): boolean {
  if (page === "overview" || page === "settings") return true;
  if (page === "rawResponses") return channel === "dev" && devMode;
  if (isInfoblockPage(page)) return infoblocksAllowed(channel, infoblocks);
  return signedIn;
}

export const navigationPages = [...dashboardResources, ...extraPages];
