import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const sourceRoot = "https://raw.githubusercontent.com/lss-information/lss-information.github.io/refs/heads/main/gameversions/nl_NL/nl_NL-Data/";
export const catalogSources = { vehicles: `${sourceRoot}Vehicles.json`, equipments: `${sourceRoot}equipments.json` };
export const vehicleDescriptionsSource = "https://raw.githubusercontent.com/MeldkamerspelGameTeam/Blog/refs/heads/main/Kostenoverzichtv2/Scripts/Data/voertuigen.json";

export function enrichVehicleDescriptions(records, source) {
  if (!Array.isArray(source) || source.length === 0) throw new Error("Ongeldige of lege voertuigomschrijvingbron.");
  const descriptions = new Map();
  for (const entry of source) {
    if (!entry || typeof entry.afkorting !== "string" || !entry.afkorting.trim() ||
      typeof entry.omschrijving !== "string" || entry.omschrijving.length > 1000 ||
      /[\x00-\x1F\x7F]/.test(entry.afkorting + entry.omschrijving) || descriptions.has(entry.afkorting)) {
      throw new Error("Ongeldige of dubbele voertuigomschrijvingen.");
    }
    descriptions.set(entry.afkorting, entry.omschrijving.trim());
  }
  const changes = [];
  const enriched = records.map((record) => {
    if (typeof record.description !== "string") throw new Error("Ongeldige lokale voertuigomschrijving.");
    const description = descriptions.get(record.name);
    if (record.description.trim() || !description) return { ...record };
    changes.push({ id: record.id, name: record.name, description });
    return { ...record, description };
  });
  return { records: enriched, changes };
}

export function updateCatalog(kind, local, source) {
  if (!Object.hasOwn(catalogSources, kind)) throw new Error("Onbekende catalogus.");
  if (!Array.isArray(local)) throw new Error("De lokale catalogus heeft een ongeldig formaat.");
  let entries;
  if (kind === "vehicles") {
    if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("Ongeldige voertuigbron.");
    entries = Object.entries(source).map(([id, value]) => {
      if (!/^(0|[1-9]\d*)$/.test(id) || !Number.isSafeInteger(Number(id))) throw new Error("Ongeldig voertuig-ID.");
      return { id: Number(id), name: value?.caption };
    });
  } else {
    if (!Array.isArray(source)) throw new Error("Ongeldige equipmentbron.");
    entries = source.map((value) => ({ id: value?.id, name: value?.name }));
  }
  if (!entries.length) throw new Error("De broncatalogus is leeg.");
  const validId = (id) => kind === "vehicles"
    ? Number.isSafeInteger(id) && id >= 0 : typeof id === "string" && /^[a-z0-9_]+$/.test(id);
  const names = new Map();
  for (const entry of entries) {
    if (!validId(entry.id) || names.has(entry.id) || typeof entry.name !== "string" ||
      !entry.name.trim() || entry.name.length > 200 || /[\x00-\x1F\x7F]/.test(entry.name)) {
      throw new Error("Ongeldige of dubbele brongegevens.");
    }
    names.set(entry.id, entry.name.trim());
  }
  const ids = new Set();
  const changes = [];
  const records = local.map((entry) => {
    if (!entry || !validId(entry.id) || ids.has(entry.id) || typeof entry.name !== "string" || !entry.name.trim()) {
      throw new Error("Ongeldige of dubbele lokale gegevens.");
    }
    ids.add(entry.id);
    const name = names.get(entry.id);
    if (name === undefined || name === entry.name) return { ...entry };
    changes.push({ id: entry.id, previousName: entry.name, name });
    return { ...entry, name };
  });
  const additions = entries.filter(({ id }) => !ids.has(id)).sort((a, b) =>
    kind === "vehicles" ? a.id - b.id : a.id.localeCompare(b.id));
  for (const { id } of additions) {
    const name = names.get(id);
    changes.push({ id, name });
    records.push(kind === "vehicles" ? { id, name, description: "", categories: [] } : { id, name });
  }
  return { records, changes };
}

export async function refreshCatalog(kind, { dryRun = false, request = fetch } = {}) {
  if (!Object.hasOwn(catalogSources, kind)) throw new Error("Onbekende catalogus.");
  const path = new URL(`../src/renderer/src/data/${kind}.json`, import.meta.url);
  const local = JSON.parse(await readFile(path, "utf8"));
  const response = await request(catalogSources[kind], {
    headers: { Accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Catalogus ophalen is mislukt (HTTP ${response.status}).`);
  let result = updateCatalog(kind, local, await response.json());
  if (kind === "vehicles") {
    const descriptions = await request(vehicleDescriptionsSource, {
      headers: { Accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(30_000),
    });
    if (!descriptions.ok) throw new Error(`Voertuigomschrijvingen ophalen is mislukt (HTTP ${descriptions.status}).`);
    const enriched = enrichVehicleDescriptions(result.records, await descriptions.json());
    result = { records: enriched.records, changes: [...result.changes, ...enriched.changes] };
  }
  if (!dryRun && result.changes.length) await writeFile(path, `${JSON.stringify(result.records, null, 2)}\n`, "utf8");
  return result.changes;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [kind, ...args] = process.argv.slice(2);
  if (args.some((arg) => arg !== "--dry-run")) throw new Error("Gebruik alleen de optie --dry-run.");
  console.log(JSON.stringify({ source: catalogSources[kind],
    changes: await refreshCatalog(kind, { dryRun: args.includes("--dry-run") }) }, null, 2));
}
