import assert from "node:assert/strict";
import test from "node:test";
import { updateBuildings, refreshBuildings } from "./update-buildings.mjs";

const building = (id, name = "Eigen naam") => ({
  id, name, smallId: 17, countBuilding: false, countLevels: true, countExtensions: true,
  extensionBuildings: [21], extensionNames: ["Eigen uitbreiding"],
});

test("building updates change names and add IDs without overwriting counting rules or removing records", () => {
  const local = [building(0), building(21), building(99)];
  const original = structuredClone(local);
  const result = updateBuildings(local, {
    0: { caption: "Brandweer kazerne", credits: 100000 },
    24: { caption: "Berger Standplaats" },
  });
  assert.deepEqual(result.buildings[0], { ...local[0], name: "Brandweer kazerne" });
  assert.deepEqual(result.buildings.slice(1, 3), local.slice(1));
  assert.deepEqual(result.buildings[3], {
    id: 24, name: "Berger Standplaats", smallId: null,
    countBuilding: true, countLevels: false, countExtensions: false,
    extensionBuildings: [], extensionNames: [],
  });
  assert.deepEqual(local, original);
  assert.equal(result.changes.length, 2);
  assert.deepEqual(updateBuildings(result.buildings, {
    0: { caption: "Brandweer kazerne" }, 24: { caption: "Berger Standplaats" },
  }).changes, []);
});

test("new buildings are appended in numeric order and retain Unicode captions", () => {
  const result = updateBuildings([], {
    27: { caption: "Spoor" }, 4: { caption: "Academie" }, 24: { caption: "Hygiëne" },
  });
  assert.deepEqual(result.buildings.map(({ id }) => id), [4, 24, 27]);
  assert.equal(result.buildings[1].name, "Hygiëne");
});

test("invalid or empty upstream catalogs fail explicitly rather than publishing partial updates", () => {
  for (const source of [null, [], {}, { "-1": { caption: "X" } }, { "01": { caption: "X" } },
    { 1: null }, { 1: { caption: "" } }, { 1: { caption: "Bad\nName" } },
    { 1: { caption: "x".repeat(201) } }, { 1: { caption: 42 } }]) {
    assert.throws(() => updateBuildings([building(0)], source), /ongeldig|leeg/);
  }
  assert.throws(() => updateBuildings([building(0), building(0)], { 0: { caption: "X" } }), /dubbel/);
});

test("source HTTP and malformed JSON failures do not write the catalog", async () => {
  await assert.rejects(refreshBuildings({
    request: async () => new Response(null, { status: 503 }),
  }), /HTTP 503/);
  await assert.rejects(refreshBuildings({
    request: async () => new Response("invalid"),
  }), SyntaxError);
});
