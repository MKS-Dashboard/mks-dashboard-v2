import type { AppInfo } from "../../shared/contracts";

export const infoblockPages = [
  "missions", "plannedMissions", "largeAllianceMissions", "seasonalEvents",
  "allianceEvents", "pointsOfInterest", "awards", "information",
  "creditComparison", "suggestions",
] as const;

export function isInfoblockPage(page: string): boolean {
  return infoblockPages.some((key) => key === page);
}

export function infoblocksAllowed(channel: AppInfo["channel"] | undefined, enabled: boolean): boolean {
  return channel === "dev" && enabled;
}
