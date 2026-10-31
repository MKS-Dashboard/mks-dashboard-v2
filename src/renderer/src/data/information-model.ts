import awards from "./awards.json" with { type: "json" };
import poi from "./poi.json" with { type: "json" };
import events from "./events.json" with { type: "json" };
import eventCategories from "./event-categories.json" with { type: "json" };
import translations from "./mission-translations.json" with { type: "json" };
import exclusions from "./mission-exclusions.json" with { type: "json" };

// Factual names, thresholds, IDs and labels extracted from upstream src/Lists at this revision.
export const informationSource = "https://github.com/MKS-Dashboard/mks-dashboard.github.io/tree/8ec537480f00a71c583c8fc3513426d2cacde021/src/Lists";
export const informationCatalog = { awards, poi, events, eventCategories, translations, exclusions };
export type Fields = Record<string, unknown>;
export interface Mission {
  id: string;
  name: string;
  baseId: number;
  credits: number;
  places: string[];
  requirements: Fields;
  additional: Fields;
  chances: Fields;
  prerequisites: Fields;
}
export interface MissionEvent { id: string; name: string; missionIds: number[] }

function record(value: unknown): Fields {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Een informatie-record heeft een ongeldig formaat.");
  }
  return value as Fields;
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("De API heeft geen lijst teruggegeven.");
  return value;
}
function identifier(value: unknown, field: string): string {
  if ((typeof value !== "string" || !value.trim()) &&
      (typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error(`Ongeldig informatieveld: ${field}.`);
  }
  return String(value);
}
function numeric(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Ongeldig getal in informatieveld: ${field}.`);
  }
  return value;
}

export function parseMissions(value: unknown): Mission[] {
  return list(value).map((item) => {
    const row = record(item);
    if (typeof row.name !== "string" || !row.name.trim()) throw new Error("Een missie heeft geen naam.");
    const id = identifier(row.id, "id");
    const places = list(row.place_array);
    if (!places.every((place): place is string => typeof place === "string")) {
      throw new Error("Een missie heeft ongeldige POI-namen.");
    }
    return {
      id, name: row.name, baseId: numeric(row.base_mission_id, "base_mission_id"),
      credits: row.average_credits == null ? 0 : numeric(row.average_credits, "average_credits"),
      places, requirements: record(row.requirements), additional: record(row.additional),
      chances: record(row.chances), prerequisites: row.prerequisites == null ? {} : record(row.prerequisites),
    };
  });
}

export function parseMissionEvents(value: unknown): MissionEvent[] {
  return list(value).map((item) => {
    const row = record(item);
    if (typeof row.caption !== "string" || !row.caption.trim()) throw new Error("Een teamevent heeft geen naam.");
    return {
      id: identifier(row.id, "event.id"), name: row.caption,
      missionIds: list(row.mission_type_ids).map((id) => numeric(id, "mission_type_ids")),
    };
  });
}

export const missionFlags = [
  { key: "followup_mission_only", label: "Alleen verspreiding" },
  { key: "subsequent_mission_only", label: "Alleen vervolginzet" },
  { key: "expansion_mission_only", label: "Alleen opschaling" },
  { key: "guard_mission", label: "Geplande inzet" },
  { key: "only_alliance_mission", label: "Teaminzet" },
  { key: "optional_event_mission", label: "Uitschakelbare eventinzet" },
] as const;

export interface MissionFilter {
  search: string;
  minCredits: string;
  maxCredits: string;
  flags: Record<string, string>;
}
export function filterMissions(missions: Mission[], filter: MissionFilter): Mission[] {
  const query = filter.search.trim().toLocaleLowerCase("nl");
  return missions.filter((mission) =>
    `${mission.id} ${mission.name} ${mission.places.join(" ")}`.toLocaleLowerCase("nl").includes(query) &&
    (!filter.minCredits || Number(filter.minCredits) <= 0 || mission.credits > Number(filter.minCredits)) &&
    (!filter.maxCredits || Number(filter.maxCredits) <= 0 || mission.credits < Number(filter.maxCredits)) &&
    missionFlags.every(({ key }) => !filter.flags[key] || filter.flags[key] === "all" ||
      Boolean(mission.additional[key]) === (filter.flags[key] === "true")));
}

export function eventMissions(missions: Mission[], ids: readonly number[]): Mission[] {
  const included = new Set(ids);
  return missions.filter((mission) => included.has(mission.baseId));
}
export function poiUsage(missions: Mission[]) {
  return poi.map((poi) => ({
    id: poi.ID, name: poi.name,
    used: missions.filter((mission) => mission.places.includes(poi.name)).length,
  }));
}

export function fieldLabel(group: string, key: string, value?: unknown): string {
  const labels = translations as unknown as Record<string, Record<string, unknown>>;
  const label = labels[group]?.[key];
  if (typeof label === "string") return label;
  if (label && typeof label === "object") {
    const forms = label as Record<string, unknown>;
    const form = forms[value === 1 ? "one" : "more"];
    if (typeof form === "string") return form;
  }
  const common: Record<string, string> = {
    personnel_educations: "Benodigde opgeleide personeelsleden",
    only_alliance_mission: "Alleen teaminzet",
    missionID: "Missie-ID",
    main_building: "Hoofdgebouwtype",
    date_start: "Begindatum", date_end: "Einddatum",
  };
  return common[key] ?? key.replaceAll("_", " ");
}
