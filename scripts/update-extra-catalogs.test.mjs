import assert from "node:assert/strict";
import test from "node:test";
import { updateCatalog, refreshCatalog, enrichVehicleDescriptions } from "./update-extra-catalogs.mjs";

test("vehicle descriptions fill only empty exact matches and preserve all other fields", () => {
  const local = [
    { id: 0, name: "SI-2", description: "", categories: ["Brandweer"] },
    { id: 1, name: "TS", description: "Eigen omschrijving", categories: [] },
    { id: 2, name: "SI‐2", description: "", categories: [] },
  ];
  const original = structuredClone(local);
  const source = [{ afkorting: "SI-2", omschrijving: " Snel Inzetbare Eenheid ", groep: "Ignored" },
    { afkorting: "TS", omschrijving: "Bronomschrijving" },
    { afkorting: "RC-Pomp", omschrijving: "Equipment" }];
  const result = enrichVehicleDescriptions(local, source);
  assert.deepEqual(result.records[0], { ...local[0], description: "Snel Inzetbare Eenheid" });
  assert.deepEqual(result.records.slice(1), local.slice(1));
  assert.deepEqual(local, original);
  assert.equal(result.changes.length, 1);
  assert.deepEqual(enrichVehicleDescriptions(result.records, source).changes, []);
});

test("invalid description sources fail explicitly and HTTP failures never write partial updates", async () => {
  for (const source of [null, [], [null], [{ afkorting: "X", omschrijving: 42 }],
    [{ afkorting: "X", omschrijving: "Bad\nName" }],
    [{ afkorting: "X", omschrijving: "One" }, { afkorting: "X", omschrijving: "Two" }]]) {
    assert.throws(() => enrichVehicleDescriptions([], source));
  }
  let calls = 0;
  await assert.rejects(refreshCatalog("vehicles", { request: async () => {
    calls++;
    return calls === 1 ? Response.json({ 0: { caption: "SI-2" } }) : new Response(null, { status: 503 });
  } }), /Voertuigomschrijvingen.*HTTP 503/);
  assert.equal(calls, 2);
});

test("vehicle names update while descriptions, categories and absent IDs remain unchanged", () => {
  const local = [{ id: 0, name: "Old", description: "Description", categories: ["Brandweer"] },
    { id: 99, name: "Local", description: "", categories: [] }];
  const original = structuredClone(local);
  const source = { 0: { caption: "SI-2" }, 24: { caption: "New", credits: 100 } };
  const result = updateCatalog("vehicles", local, source);
  assert.deepEqual(result.records[0], { ...local[0], name: "SI-2" });
  assert.deepEqual(result.records[1], local[1]);
  assert.deepEqual(result.records[2], { id: 24, name: "New", description: "", categories: [] });
  assert.deepEqual(local, original);
  assert.deepEqual(updateCatalog("vehicles", result.records, source).changes, []);
});

test("equipment imports only IDs and names and never removes existing records", () => {
  const source = [{ id: "robot", name: "Robot", size: 20, credits: 100 }];
  const result = updateCatalog("equipments", [{ id: "old", name: "Old" }], source);
  assert.deepEqual(result.records, [{ id: "old", name: "Old" }, { id: "robot", name: "Robot" }]);
  assert.deepEqual(updateCatalog("equipments", result.records, source).changes, []);
  const renamed = updateCatalog("equipments", result.records, [{ id: "robot", name: "New" }]);
  assert.equal(renamed.records[1].name, "New");
});

test("invalid source catalogs and duplicate IDs fail before making changes", () => {
  for (const source of [null, [], {}, { "-1": { caption: "X" } }, { "01": { caption: "X" } },
    { 1: { caption: "" } }, { 1: { caption: "X\nY" } }]) {
    assert.throws(() => updateCatalog("vehicles", [], source));
  }
  for (const source of [{}, [], [null], [{ id: "bad id", name: "X" }],
    [{ id: "x", name: "X" }, { id: "x", name: "Y" }]]) {
    assert.throws(() => updateCatalog("equipments", [], source));
  }
  assert.throws(() => updateCatalog("unknown", [], {}));
  assert.throws(() => updateCatalog("vehicles", [{ id: 0, name: "X" }, { id: 0, name: "Y" }],
    { 0: { caption: "X" } }));
});

test("network, HTTP and JSON failures are explicit", async () => {
  await assert.rejects(refreshCatalog("equipments", {
    request: async () => new Response(null, { status: 503 }),
  }), /HTTP 503/);
  await assert.rejects(refreshCatalog("vehicles", {
    request: async () => new Response("invalid"),
  }), SyntaxError);
});
