import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

const require = createRequire(import.meta.url);
async function loadModule(path) {
  const result = await build({
    entryPoints: [path], bundle: true, write: false, platform: "node",
    format: "cjs", jsx: "automatic", external: ["react", "react-dom"],
  });
  const module = { exports: {} };
  new Function("module", "exports", "require", result.outputFiles[0].text)(module, module.exports, require);
  return module.exports;
}
const reference = await loadModule("src/main/reference-data.ts");
const pages = await loadModule("src/renderer/src/AccountPages.tsx");
const ok = (data) => ({ ok: true, data });
const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test("reference data permits only known keys and does not forward session credentials", async () => {
  assert.throws(() => reference.referenceUrl("missions:../../secret"), /niet toegestaan/);
  assert.throws(() => reference.referenceUrl("https://example.com"), /niet toegestaan/);
  assert.ok(reference.referenceUrl("missions:nl_NL").endsWith("/Missions/nl_NL.json"));
  let requests = 0;
  const result = await reference.loadReference("suggestions", async (url, options) => {
    requests++;
    assert.equal(new URL(url).hostname, "api.github.com");
    assert.equal(new URL(url).searchParams.has("_session_id"), false);
    assert.equal("Authorization" in options.headers, false);
    return Response.json(requests === 1 ? Array(100).fill({ number: 1 }) : [{ number: 2 }]);
  });
  assert.equal(result.ok, true);
  assert.equal(result.data.length, 101);
  assert.equal(requests, 2);
});

test("external links are HTTPS and limited to expected public hosts", () => {
  assert.equal(reference.allowedExternalUrl("https://github.com/MKS-Dashboard/mks-dashboard.github.io/issues/1"),
    "https://github.com/MKS-Dashboard/mks-dashboard.github.io/issues/1");
  for (const url of ["file:///secret", "https://evil.test", "https://github.com.evil.test", "https://user:password@github.com"]) {
    assert.throws(() => reference.allowedExternalUrl(url));
  }
});

test("public reference HTTP errors remain explicit failures", async () => {
  const result = await reference.loadReference("missions:nl_NL",
    async () => new Response("", { status: 503 }));
  assert.equal(result.ok, false);
  assert.match(result.error, /HTTP 503/);
});

test("credit statistics split ordinary, planned and alliance missions and handle empty buckets", () => {
  assert.deepEqual(pages.creditStatistics([
    { average_credits: 100, additional: {} }, { average_credits: 300, additional: {} },
    { average_credits: 800, additional: { guard_mission: true } },
    { average_credits: 2000, additional: { only_alliance_mission: true } },
  ]), [2, 200, 1, 800, 1, 2000]);
  assert.deepEqual(pages.creditStatistics([]), [0, "Geen missies", 0, "Geen missies", 0, "Geen missies"]);
  assert.throws(() => pages.creditStatistics([{ average_credits: "100", additional: {} }]), /creditwaarde/);
});

test("team overview presents finance and members without JSON", () => {
  const html = render(pages.AlliancePage, { result: ok({
    id: 7, name: "Demoteam", rank: 3, credits_total: 12000, credits_current: 500, finance_active: true,
    users: [{ id: 1, name: "Speler", caption: "Bijnaam", roles: ["admin"] }],
  }) });
  assert.match(html, /Demoteam/);
  assert.match(html, /Teamkas ingeschakeld/);
  assert.match(html, /Speler/);
  assert.match(html, /admin/);
  assert.equal(html.includes("<pre"), false);
});

test("building details show names, active specializations and accurate local capacity", () => {
  const result = ok([
    { id: 10, caption: "Centraal ziekenhuis", building_type: 2, patient_count: 7, level: 3,
      extensions: [{ caption: "Groot ziekenhuis", available: true }], specialization: { type: "airport", active: false } },
  ]);
  const html = render(pages.BuildingDetailsPage, { result, kind: "hospitals" });
  assert.match(html, /Centraal ziekenhuis/);
  assert.match(html, />23</);
  assert.match(html, />16</);
  const specializations = render(pages.BuildingDetailsPage, { result, kind: "specializations" });
  assert.match(specializations, /Luchthaven Specialisatie/);
  assert.match(specializations, />Nee</);
});

test("unavailable and empty accounts are explicit, not loading indefinitely", () => {
  assert.match(render(pages.AlliancePage, { result: ok({}) }), /geen beschikbare teamgegevens/);
  assert.match(render(pages.BuildingDetailsPage, { result: ok([]), kind: "cells" }), /Geen resultaten gevonden/);
  assert.match(render(pages.SchoolingsPage, { result: { ok: false, error: "API niet beschikbaar" } }), /API niet beschikbaar/);
});
