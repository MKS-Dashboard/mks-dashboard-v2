import assert from "node:assert/strict";
import test from "node:test";
import {
  parseVehicles, parseBuildings, vehicleOverview, buildingOverview, capacityOverview,
} from "../src/renderer/src/dashboard-model.ts";

const building = (building_type, fields = {}) => ({ building_type, extensions: [], ...fields });
const extension = (caption, fields = {}) => ({ caption, available: true, enabled: true, ...fields });

test("vehicles show real type names, groups and weighted water capacity", () => {
  const overview = vehicleOverview(parseVehicles([
    { vehicle_type: 0 }, { vehicle_type: 1 }, { vehicle_type: 1 }, { vehicle_type: 16 },
  ]));
  assert.equal(overview.total, 4);
  const fire = overview.categories.find((category) => category.category === "Brandweer");
  assert.equal(fire.total, 3);
  assert.equal(fire.types.find((type) => type.id === 1).count, 2);
  assert.equal(fire.groups.find((group) => group.name === "Tankautospuiten").count, 3);
  assert.equal(fire.values.find((value) => value.name === "Liters Water (geen Boost)").count, 4500);
});

test("all types are counted without the old 200-record limit, including unknown types", () => {
  const overview = vehicleOverview(parseVehicles([
    ...Array.from({ length: 250 }, () => ({ vehicle_type: 1 })), { vehicle_type: 999 },
  ]));
  assert.equal(overview.total, 251);
  assert.equal(overview.categories[0].total, 250);
  assert.equal(overview.unknown[0].count, 1);
});

test("buildings normalize small stations and count levels and SAR hangars without mutating API data", () => {
  const raw = [
    building(0, { small_building: true }),
    building(9, { level: 2 }),
    building(21, { extensions: [extension("SAR Helikopter Hangar"), extension("Extra SAR Helikopter Hangar")] }),
  ];
  const before = structuredClone(raw);
  const overview = buildingOverview(parseBuildings(raw));
  assert.equal(overview.physical, 3);
  assert.equal(overview.technical, 6);
  assert.deepEqual(overview.types.find((row) => row.name === "Brandweer, Kazerne (Klein)"),
    { name: "Brandweer, Kazerne (Klein)", physical: 1, technical: 1 });
  assert.equal(overview.types.find((row) => row.name === "SAR Helikopter platform").technical, 2);
  assert.deepEqual(raw, before);
});

test("extensions and specializations are aggregated with explicit unknown status", () => {
  const overview = buildingOverview(parseBuildings([
    building(0, {
      extensions: [extension("Schuimblussing"), extension("Schuimblussing", { enabled: false }), { caption: "Schuimblussing" }],
      specialization: { type: "fire_support" },
    }),
  ]));
  assert.deepEqual(overview.extensions[0],
    { name: "Schuimblussing", count: 3, active: 1, inactive: 1, pending: 1 });
  assert.equal(overview.specializations[0].name, "Schuimblussing Specialisatie");
});

test("progress counts beds, cells and classrooms using only available capacity", () => {
  const own = capacityOverview(parseBuildings([
    building(2, { level: 3, patient_count: 7, extensions: [extension("Groot ziekenhuis"), extension("Groot ziekenhuis", { available: false })] }),
    building(5, { prisoner_count: 2, extensions: [extension("Extra cel"), extension("Grote gevangenis")] }),
    building(4, { schoolings: [{}, {}], extensions: [extension("Extra klaslokaal"), extension("Extra klaslokaal", { available: false })] }),
  ]));
  assert.deepEqual(own.beds, { total: 23, used: 7 });
  assert.deepEqual(own.cells, { total: 11, used: 2 });
  assert.deepEqual(own.schools[0], { name: "Brandweer, Academie", total: 2, used: 2 });
  const team = capacityOverview(parseBuildings([
    building(12, { prisoner_count: 5, extensions: [extension("Extra cel")] }),
  ]), true);
  assert.deepEqual(team.cells, { total: 11, used: 5 });
});

test("empty accounts have zero capacity and invalid API shapes report errors", () => {
  assert.deepEqual(capacityOverview([]).beds, { total: 0, used: 0 });
  assert.equal(buildingOverview([]).technical, 0);
  assert.throws(() => parseVehicles({}), /geen lijst/);
  assert.throws(() => parseVehicles([{}]), /vehicle_type/);
  assert.throws(() => parseBuildings([building(2, { extensions: [{}] })]), /zonder naam/);
  assert.throws(() => parseBuildings([building(2, { patient_count: "7" })]), /patient_count/);
});
