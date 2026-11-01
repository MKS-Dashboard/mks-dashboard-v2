import vehicles from "./data/vehicles.json" with { type: "json" };
import groups from "./data/vehicle-groups.json" with { type: "json" };
import values from "./data/vehicle-values.json" with { type: "json" };
import buildings from "./data/buildings.json" with { type: "json" };
import specializations from "./data/specializations.json" with { type: "json" };
import schools from "./data/schools.json" with { type: "json" };

const catalog = { vehicles, groups, values, buildings, specializations, schools };

export interface Vehicle {
  id?: number;
  type: number;
  buildingId?: number;
  name?: string;
}

export interface Equipment {
  id: number;
  type: string;
  name: string;
  buildingId: number;
  vehicleId: number | null;
  assignedVehicleId: number | null;
  size: number;
}

export function parseEquipments(data: unknown): Equipment[] {
  function id(value: unknown, field: string): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`Het API-veld '${field}' is geen geldig ID.`);
    }
    return value;
  }
  const ids = new Set<number>();
  return array(data).map((item) => {
    const record = object(item);
    const equipmentId = id(record.id, "id");
    if (ids.has(equipmentId)) throw new Error("De equipmentgegevens bevatten een dubbel ID.");
    ids.add(equipmentId);
    if (typeof record.equipment_type !== "string" || !record.equipment_type.trim() ||
      typeof record.caption !== "string") {
      throw new Error("De equipmentgegevens bevatten een ongeldig type of naam.");
    }
    return {
      id: equipmentId, type: record.equipment_type, name: record.caption,
      buildingId: id(record.building_id, "building_id"),
      vehicleId: record.vehicle_id == null ? null : id(record.vehicle_id, "vehicle_id"),
      assignedVehicleId: record.assigned_vehicle_id == null ? null : id(record.assigned_vehicle_id, "assigned_vehicle_id"),
      size: number(record.size, "size"),
    };
  });
}

export interface Extension {
  caption: string;
  enabled?: boolean;
  available?: boolean;
}

export interface Building {
  id?: number;
  name?: string;
  type: number;
  small: boolean;
  level: number;
  patients: number;
  prisoners: number;
  schoolings: number;
  extensions: Extension[];
  specialization?: string;
  specializationActive?: boolean;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Een API-record heeft een ongeldig formaat.");
  }
  return value as Record<string, unknown>;
}

function number(value: unknown, field: string, optional = false): number {
  if (optional && (value === undefined || value === null)) return 0;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Het API-veld '${field}' is geen geldig getal.`);
  }
  return value;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("De API heeft geen lijst teruggegeven.");
  return value;
}

export function parseVehicles(value: unknown): Vehicle[] {
  return array(value).map((item) => {
    const record = object(item);
    return { 
      id: record.id == null ? undefined : number(record.id, "id"),
      type: number(record.vehicle_type, "vehicle_type"),
      buildingId: record.building_id == null ? undefined : number(record.building_id, "building_id"),
      name: typeof record.caption === "string" ? record.caption : undefined,
    };
  });
}

export function parseBuildings(value: unknown): Building[] {
  return array(value).map((item) => {
    const record = object(item);
    const specialization = record.specialization == null ? undefined : object(record.specialization).type;
    if (specialization !== undefined && typeof specialization !== "string") {
      throw new Error("De API heeft een ongeldige gebouwspecialisatie teruggegeven.");
    }
    return {
      id: record.id == null ? undefined : number(record.id, "id"),
      name: typeof record.caption === "string" ? record.caption : undefined,
      type: number(record.building_type, "building_type"),
      small: record.small_building === true,
      level: number(record.level, "level", true),
      patients: number(record.patient_count, "patient_count", true),
      prisoners: number(record.prisoner_count, "prisoner_count", true),
      schoolings: record.schoolings == null ? 0 : array(record.schoolings).length,
      specialization,
      specializationActive: record.specialization == null ? undefined :
        typeof object(record.specialization).active === "boolean" ? object(record.specialization).active === true : undefined,
      extensions: record.extensions == null ? [] : array(record.extensions).map((item) => {
        const extension = object(item);
        if (typeof extension.caption !== "string") {
          throw new Error("De API heeft een uitbreiding zonder naam teruggegeven.");
        }
        if (
          (extension.enabled !== undefined && typeof extension.enabled !== "boolean") ||
          (extension.available !== undefined && typeof extension.available !== "boolean")
        ) {
          throw new Error("De API heeft een ongeldige uitbreidingstatus teruggegeven.");
        }
        return {
          caption: extension.caption,
          enabled: extension.enabled,
          available: extension.available,
        };
      }),
    };
  });
}

const alphabetical = <T extends { name: string }>(rows: T[]): T[] =>
  rows.sort((a, b) => a.name.localeCompare(b.name, "nl"));

export const vehicleCategories = [
  { name: "Brandweer", category: "Brandweer", tone: "fire" },
  { name: "Ambulance", category: "Ambulance", tone: "medical" },
  { name: "Politie", category: "Politie", tone: "police" },
  { name: "Kustwacht / Waterredding", category: "Kustwacht", tone: "rescue" },
  { name: "Rijkswaterstaat", category: "RWS", tone: "medical" },
];

export function vehicleOverview(vehicles: Vehicle[]) {
  const counts = new Map<number, number>();
  for (const vehicle of vehicles) counts.set(vehicle.type, (counts.get(vehicle.type) ?? 0) + 1);
  const types = alphabetical(catalog.vehicles.map((type) => ({ ...type, count: counts.get(type.id) ?? 0 })));
  const unknown = [...counts].filter(([id]) => !catalog.vehicles.some((type) => type.id === id));
  return {
    total: vehicles.length,
    categories: vehicleCategories.map((category) => ({
      ...category,
      total: types.filter((type) => type.categories.includes(category.category)).reduce((sum, type) => sum + type.count, 0),
      types: types.filter((type) => type.count > 0 && type.categories.includes(category.category)),
      groups: alphabetical(catalog.groups
        .filter((group) => group.categories.includes(category.category) && group.vehicles.length > 1)
        .map((group) => ({
          name: group.name,
          count: group.vehicles.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0),
          description: group.vehicles.map((id) =>
            catalog.vehicles.find((type) => type.id === id)?.name ?? `Type ${id}`).join(", "),
        })).filter((group) => group.count > 0)),
      values: catalog.values
        .filter((value) => value.categories.includes(category.category))
        .map((value) => ({
          name: value.name,
          count: value.vehicles.reduce((sum, type) => sum + (counts.get(type.id) ?? 0) * type.amount, 0),
        })).filter((value) => value.count > 0),
    })),
    unknown: unknown.map(([id, count]) => ({ name: `Onbekend voertuigtype ${id}`, count })),
  };
}

export function buildingOverview(buildings: Building[]) {
  const normalized = buildings.map((building) => ({
    ...building,
    type: building.small
      ? catalog.buildings.find((type) => type.id === building.type)?.smallId ?? building.type
      : building.type,
  }));
  const types = catalog.buildings.map((type) => {
    const matching = normalized.filter((building) => building.type === type.id);
    const technical = type.countExtensions
      ? normalized.filter((building) => type.extensionBuildings.some((id) => id === building.type))
        .reduce((sum, building) => sum + building.extensions.filter((extension) =>
          type.extensionNames.some((name) => name === extension.caption)).length, 0)
      : type.countBuilding
        ? matching.reduce((sum, building) => sum + 1 + (type.countLevels ? building.level : 0), 0)
        : 0;
    return { name: type.name, physical: matching.length, technical };
  });
  for (const building of normalized) {
    if (catalog.buildings.some((type) => type.id === building.type)) continue;
    const name = `Onbekend gebouwtype ${building.type}`;
    const row = types.find((type) => type.name === name);
    if (row) { row.physical++; row.technical++; }
    else types.push({ name, physical: 1, technical: 1 });
  }
  const extensions = new Map<string, { name: string; count: number; active: number; inactive: number; pending: number }>();
  const specializations = new Map<string, { name: string; count: number }>();
  for (const building of buildings) {
    for (const extension of building.extensions) {
      const row = extensions.get(extension.caption) ??
        { name: extension.caption, count: 0, active: 0, inactive: 0, pending: 0 };
      row.count++;
      if (extension.enabled === true) row.active++;
      else if (extension.enabled === false) row.inactive++;
      else row.pending++;
      extensions.set(extension.caption, row);
    }
    if (building.specialization) {
      const type = building.specialization;
      const name = catalog.specializations.find((item) => item.type === type)?.name ?? `Specialisatie ${type}`;
      const row = specializations.get(type) ?? { name, count: 0 };
      row.count++;
      specializations.set(type, row);
    }
  }
  return {
    physical: buildings.length,
    technical: types.reduce((sum, type) => sum + type.technical, 0),
    types: alphabetical(types.filter((type) => type.physical > 0 || type.technical > 0)),
    extensions: alphabetical([...extensions.values()]),
    specializations: alphabetical([...specializations.values()]),
  };
}

export interface Capacity {
  total: number;
  used: number;
}

export function capacityOverview(buildings: Building[], alliance = false) {
  const extensionCount = (building: Building, captions: string[]) =>
    building.extensions.filter((extension) => extension.available === true && captions.includes(extension.caption)).length;
  const sum = (type: number, capacity: (building: Building) => number, used: (building: Building) => number): Capacity =>
    buildings.filter((building) => building.type === type).reduce((sum, building) => ({
      total: sum.total + capacity(building),
      used: sum.used + used(building),
    }), { total: 0, used: 0 });
  return {
    beds: sum(2, (building) => 10 + building.level + extensionCount(building, ["Groot ziekenhuis"]) * 10,
      (building) => building.patients),
    cells: sum(alliance ? 12 : 5, (building) => (alliance ? 10 : 0) +
      extensionCount(building, ["Gevangeniscel", "Extra cel"]) +
      extensionCount(building, ["Grote gevangenis"]) * 10, (building) => building.prisoners),
    schools: catalog.schools.map((school) => ({
      name: school.name,
      ...sum(school.building_id, (building) => 1 + extensionCount(building, ["Extra klaslokaal"]),
        (building) => building.schoolings),
    })),
  };
}

export function getVehicleTypeInfo(typeId: number): { id: number; name: string; description: string } | null {
  const vehicleType = catalog.vehicles.find((v) => v.id === typeId);
  return vehicleType ? { id: vehicleType.id, name: vehicleType.name, description: vehicleType.description } : null;
}
