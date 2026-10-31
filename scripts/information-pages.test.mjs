import assert from "node:assert/strict";
import test from "node:test";
import {
  parseMissions, parseMissionEvents, filterMissions, eventMissions, poiUsage, fieldLabel,
  informationCatalog,
} from "../src/renderer/src/data/information-model.ts";

const raw = (id, additional = {}, fields = {}) => ({
  id: String(id), base_mission_id: id, name: `Inzet ${id}`, average_credits: 500,
  place_array: ["Park"], requirements: { firetrucks: 1 }, chances: {}, additional, ...fields,
});
const filter = (fields = {}) => ({ search: "", minCredits: "", maxCredits: "", flags: {}, ...fields });

test("mission schemas accept live and reference IDs and preserve education data", () => {
  const missions = parseMissions([raw(1, {}, { requirements: { personnel_educations: { critical_care: 2 } } })]);
  assert.equal(missions[0].baseId, 1);
  assert.deepEqual(missions[0].requirements.personnel_educations, { critical_care: 2 });
  assert.equal(fieldLabel("requirements", "firetrucks", 1), "Tankautospuit");
  assert.equal(fieldLabel("requirements", "firetrucks", 2), "Tankautospuiten");
});
test("all six original tri-state filters and strict credit thresholds work", () => {
  const missions = parseMissions([raw(1), raw(2, {
    followup_mission_only: true, subsequent_mission_only: true, expansion_mission_only: true,
    guard_mission: true, only_alliance_mission: true, optional_event_mission: true,
  }, { average_credits: 1000 })]);
  for (const key of Object.keys(missions[1].additional)) {
    assert.deepEqual(filterMissions(missions, filter({ flags: { [key]: "true" } })).map((m) => m.id), ["2"]);
    assert.deepEqual(filterMissions(missions, filter({ flags: { [key]: "false" } })).map((m) => m.id), ["1"]);
  }
  assert.deepEqual(filterMissions(missions, filter({ minCredits: "500", maxCredits: "1001" })).map((m) => m.id), ["2"]);
  assert.equal(filterMissions(missions, filter({ search: "park" })).length, 2);
});
test("event matching uses base IDs, includes overlays, and does not mutate inputs", () => {
  const source = [raw(1), raw(1, {}, { id: "1/overlay" }), raw(2)];
  const before = structuredClone(source);
  const missions = parseMissions(source);
  const event = parseMissionEvents([{ id: 0, caption: "Storm", mission_type_ids: [1, 1] }])[0];
  assert.equal(eventMissions(missions, event.missionIds).length, 2);
  assert.deepEqual(source, before);
});
test("POI counts variants once per mission, keeping unused POI types", () => {
  const usage = poiUsage(parseMissions([raw(1, {}, { place_array: ["Park", "Park"] }), raw(2)]));
  assert.equal(usage.find((poi) => poi.name === "Park").used, 2);
  assert.equal(usage.find((poi) => poi.name === "Meer").used, 0);
  assert.equal(usage.length, informationCatalog.poi.length);
});
test("planned-only filtering remains separate from seasonal event membership", () => {
  const missions = parseMissions([
    raw(1, { guard_mission: true }), raw(146), raw(147, { guard_mission: true }),
  ]);
  assert.deepEqual(filterMissions(missions, filter({ flags: { guard_mission: "true" } })).map((m) => m.id), ["1", "147"]);
  const halloween = informationCatalog.events.find((event) => event.name === "Halloween");
  assert.deepEqual(eventMissions(missions, halloween.mission_ids).map((m) => m.id), ["146", "147"]);
});
test("split catalogs retain factual records and translation groups", () => {
  assert.equal(informationCatalog.awards.length, 95);
  assert.equal(informationCatalog.poi.length, 73);
  assert.equal(informationCatalog.events.length, 18);
  assert.equal(informationCatalog.eventCategories.length, 20);
  assert.deepEqual(Object.keys(informationCatalog.translations).sort(),
    ["additional", "chances", "personnel_educations", "requirements"]);
  assert.deepEqual(Object.keys(informationCatalog.exclusions).sort(),
    ["allianceEvents", "allianceMissions", "missions"]);
});
test("malformed API data surfaces explicit errors instead of empty tables", () => {
  assert.throws(() => parseMissions({}), /geen lijst/);
  assert.throws(() => parseMissions([raw(1, {}, { requirements: null })]), /ongeldig formaat/);
  assert.throws(() => parseMissions([raw(1, {}, { base_mission_id: "1" })]), /base_mission_id/);
  assert.throws(() => parseMissions([raw(1, {}, { place_array: [3] })]), /POI/);
  assert.throws(() => parseMissionEvents([{ id: 0, caption: "Storm", mission_type_ids: ["1"] }]), /mission_type_ids/);
});
