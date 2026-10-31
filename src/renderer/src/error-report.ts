import { dashboardResources, type AppInfo, type DashboardData, type DashboardResourceResult, type ReferenceKey, type UpdateStatus } from "../../shared/contracts";
import { parseBuildings, parseVehicles } from "./dashboard-model";
import { parseMissionEvents, parseMissions } from "./data/information-model";
import { schoolingRecords } from "./schoolings";
import vehicles from "./data/vehicles.json";
import buildings from "./data/buildings.json";
import specializations from "./data/specializations.json";

const observedIssues = new Set<string>();
const referenceErrors = new Map<ReferenceKey, string>();

export function reportMessage(value: unknown): string {
  const message = value instanceof Error ? value.message : typeof value === "string" ? value : "Onbekende fout.";
  return message.replace(/((?:_session_id|sessionid|session_id)["']?\s*(?:=|%3D|:)\s*["']?)[^&\s"'<>]+/gi, "$1[afgeschermd]");
}

export function recordAppIssue(source: string, message: unknown): void {
  observedIssues.add(`${source}: ${reportMessage(message)}`);
}

export function clearReportIssues(): void {
  observedIssues.clear();
  referenceErrors.clear();
}

export async function loadReportedReference(key: ReferenceKey): Promise<DashboardResourceResult> {
  try {
    const result = await window.mksDashboard.loadReference(key);
    if (result.ok) referenceErrors.delete(key);
    else referenceErrors.set(key, reportMessage(result.error));
    return result;
  } catch (cause) {
    referenceErrors.set(key, reportMessage(cause));
    throw cause;
  }
}

function requireObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("De gegevens hebben een ongeldig objectformaat.");
  }
  return value as Record<string, unknown>;
}

export function generateErrorReport({ data, appInfo, lastUpdated, updateStatus, errors = [], now = new Date() }: {
  data: DashboardData | null;
  appInfo: AppInfo | null;
  lastUpdated: Date | null;
  updateStatus: UpdateStatus;
  errors?: string[];
  now?: Date;
}): string {
  const issues = new Map<string, number>();
  function add(message: string): void {
    const safe = reportMessage(message);
    issues.set(safe, (issues.get(safe) ?? 0) + 1);
  }
  function check(source: string, action: () => void): void {
    try { action(); }
    catch (cause) { add(`${source}: verwerkingsfout: ${reportMessage(cause)}`); }
  }
  if (!data) add("Er zijn nog geen dashboardgegevens beschikbaar om te controleren.");
  for (const resource of dashboardResources) {
    const result = data?.[resource.key];
    if (!result) continue;
    const source = `${resource.label} (${resource.endpoint})`;
    if (!result.ok) {
      add(`${source}: ophalen mislukt: ${reportMessage(result.error)}`);
      continue;
    }
    check(source, () => {
      if (resource.key === "vehicles" || resource.key === "buildings" || resource.key === "allianceBuildings") {
        if (!Array.isArray(result.data)) throw new Error("De API heeft geen lijst teruggegeven.");
        result.data.forEach((item, index) => check(`${source}, record ${index + 1}`, () => {
          if (resource.key === "vehicles") {
            const [vehicle] = parseVehicles([item]);
            if (!vehicles.some(({ id }) => id === vehicle.type)) add(`${source}: onbekend voertuigtype ${vehicle.type}`);
          } else {
            const [building] = parseBuildings([item]);
            if (!buildings.some(({ id }) => id === building.type)) add(`${source}: onbekend gebouwtype ${building.type}`);
            if (building.specialization && !specializations.some(({ type }) => type === building.specialization)) {
              add(`${source}: onbekende specialisatie ${building.specialization}`);
            }
          }
        }));
      } else if (resource.key === "schoolings" || resource.key === "allianceSchoolings") {
        schoolingRecords(result.data);
      } else if (resource.key === "missions" || resource.key === "pointsOfInterest") {
        parseMissions(result.data);
      } else if (resource.key === "allianceEvents") {
        parseMissionEvents(result.data);
      } else if (resource.key === "allianceInfo") {
        const team = requireObject(result.data);
        if (team.id == null) throw new Error("Je account heeft geen beschikbare teamgegevens.");
        if (!Array.isArray(team.users)) throw new Error("De teamleden bevatten geen lijst.");
        for (const user of team.users) {
          if (!Array.isArray(requireObject(user).roles)) throw new Error("De teamrollen bevatten geen lijst.");
        }
      } else {
        requireObject(result.data);
      }
    });
  }
  for (const error of errors.filter(Boolean)) add(`App: ${reportMessage(error)}`);
  if (updateStatus.state === "error") add(`Updates: ${reportMessage(updateStatus.message ?? "Updatecontrole of installatie mislukt.")}`);
  for (const [key, error] of referenceErrors) add(`Openbare gegevens ${key}: ${error}`);
  const lines = [...issues].map(([message, count]) => `- ${message}${count > 1 ? ` (${count} keer)` : ""}`);
  const timestamp = (date: Date) => date.toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" });
  return [
    "MKS Dashboard - errorrapport",
    `Gegenereerd: ${timestamp(now)} (Europe/Amsterdam)`,
    `Appversie: ${appInfo?.version ?? "Niet beschikbaar"}`,
    `Kanaal: ${appInfo ? appInfo.channel === "dev" ? "Beta" : "Stable" : "Niet beschikbaar"}`,
    `Gegevens opgehaald: ${lastUpdated ? timestamp(lastUpdated) : "Nog niet opgehaald"}`,
    "",
    "Dit rapport controleert de laatst opgehaalde gegevens; er worden geen nieuwe verzoeken gedaan.",
    "Niet opgehaalde bronnen en niet opgetreden fouten kunnen niet worden beoordeeld.",
    "Geen volledige responses opgenomen; accountnamen en gebouwlocaties worden niet uit de gegevens overgenomen.",
    "SessionID-parameters in foutmeldingen worden afgeschermd.",
    "",
    `Huidige bevindingen (${issues.size}):`,
    ...(lines.length ? lines : ["Geen problemen gevonden in de beschikbare gegevens en foutstatussen."]),
    "",
    `Overige waargenomen fouten tijdens deze appsessie (${observedIssues.size}, kunnen inmiddels zijn opgelost):`,
    ...(observedIssues.size ? [...observedIssues].map((issue) => `- ${issue}`) : ["Geen overige fouten waargenomen."]),
    "",
    "Controleer het rapport voordat je het deelt; foutmeldingen kunnen aanvullende informatie bevatten.",
  ].join("\n");
}
