import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const buildingsSource = "https://raw.githubusercontent.com/lss-information/lss-information.github.io/refs/heads/main/gameversions/nl_NL/nl_NL-Data/buildings.json";
const catalogPath = new URL("../src/renderer/src/data/buildings.json", import.meta.url);

export function updateBuildings(local, source) {
  if (!Array.isArray(local) || !source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("De gebouwcatalogus of bron heeft een ongeldig formaat.");
  }
  const ids = new Set();
  for (const building of local) {
    if (!building || !Number.isSafeInteger(building.id) || building.id < 0 || ids.has(building.id) ||
      typeof building.name !== "string" || !building.name.trim()) {
      throw new Error("De lokale gebouwcatalogus bevat een ongeldig of dubbel gebouw-ID.");
    }
    ids.add(building.id);
  }
  const entries = Object.entries(source);
  if (entries.length === 0) throw new Error("De broncatalogus is leeg.");
  const names = new Map();
  for (const [id, building] of entries) {
    if (!/^(0|[1-9]\d*)$/.test(id) || !Number.isSafeInteger(Number(id)) ||
      !building || typeof building !== "object" || Array.isArray(building) ||
      typeof building.caption !== "string" || !building.caption.trim() ||
      building.caption.length > 200 || /[\x00-\x1F\x7F]/.test(building.caption)) {
      throw new Error(`De bron bevat ongeldige gebouwgegevens voor ID ${id}.`);
    }
    names.set(Number(id), building.caption.trim());
  }
  const changes = [];
  const buildings = local.map((building) => {
    const name = names.get(building.id);
    if (name === undefined || name === building.name) return { ...building };
    changes.push({ id: building.id, previousName: building.name, name });
    return { ...building, name };
  });
  for (const [id, name] of [...names].sort(([left], [right]) => left - right)) {
    if (ids.has(id)) continue;
    changes.push({ id, name });
    buildings.push({
      id, name, smallId: null, countBuilding: true, countLevels: false,
      countExtensions: false, extensionBuildings: [], extensionNames: [],
    });
  }
  return { buildings, changes };
}

export async function refreshBuildings({ dryRun = false, request = fetch } = {}) {
  const response = await request(buildingsSource, {
    headers: { Accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Gebouwgegevens ophalen is mislukt (HTTP ${response.status}).`);
  const local = JSON.parse(await readFile(catalogPath, "utf8"));
  const result = updateBuildings(local, await response.json());
  if (result.changes.length && !dryRun) {
    await writeFile(catalogPath, `${JSON.stringify(result.buildings, null, 2)}\n`, "utf8");
  }
  return result.changes;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--dry-run")) throw new Error("Gebruik alleen de optie --dry-run.");
  const changes = await refreshBuildings({ dryRun: args.includes("--dry-run") });
  console.log(JSON.stringify({ source: buildingsSource, changes }, null, 2));
}
