import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
async function loadModule(path, mocks = {}) {
  const result = await build({
    entryPoints: [path], bundle: true, write: false, platform: "node",
    format: "cjs", jsx: "automatic", external: ["react", "react-dom", "electron", "electron-updater"],
    define: { "import.meta.url": JSON.stringify(new URL(`../${path}`, import.meta.url).href) },
  });
  const module = { exports: {} };
  new Function("module", "exports", "require", result.outputFiles[0].text)(
    module, module.exports, (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
  );
  return module.exports;
}
const reference = await loadModule("src/main/reference-data.ts");
const pages = await loadModule("src/renderer/src/AccountPages.tsx");
const infoblocks = await loadModule("src/renderer/src/infoblocks.ts");
const rawPages = await loadModule("src/renderer/src/RawResponsesPage.tsx");
const navigation = await loadModule("src/renderer/src/navigation.ts");
const schoolings = await loadModule("src/renderer/src/schoolings.ts");
const refreshInterval = await loadModule("src/renderer/src/refresh-interval.ts");
const reports = await loadModule("src/renderer/src/error-report.ts");
const reportPanel = await loadModule("src/renderer/src/ErrorReportPanel.tsx");
const app = await loadModule("src/renderer/src/App.tsx");
const reportInput = (data = null) => ({
  data, appInfo: { version: "2026.1031.1400", channel: "stable" },
  lastUpdated: null, updateStatus: { state: "idle" }, now: new Date("2026-10-31T12:00:00Z"),
});
const ok = (data) => ({ ok: true, data });
const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test("login help explains how to copy the SessionID in Chrome, Edge and Firefox without exposing it", () => {
  const html = render(app.SessionIdInstructions);
  assert.match(html, /<details class="session-help"><summary>Hoe vind ik mijn SessionID\?/);
  assert.match(html, /https:\/\/meldkamerspel\.com/);
  assert.match(html, /log in op je spelaccount/);
  assert.match(html, /<kbd>F12<\/kbd>/);
  assert.match(html, /Chrome \/ Edge:.*Application \(Applicatie\)/);
  assert.match(html, /Firefox:.*Storage \(Opslag\)/);
  assert.match(html, /Cookies/);
  assert.match(html, /<code>_session_id<\/code>.*Value \(Waarde\)/);
  assert.match(html, /niet de cookienaam/);
  assert.match(html, /SessionID opslaan en ophalen/);
  assert.match(html, /deel deze nooit/);
  assert.doesNotMatch(html, /<details[^>]* open/);
});

test("error reports aggregate unknown types, all failed sources and malformed records without raw account data", () => {
  reports.clearReportIssues();
  const result = reports.generateErrorReport({
    ...reportInput({
      vehicles: ok([{ vehicle_type: 9999, caption: "PRIVATE VEHICLE" }, { vehicle_type: 9999 }, null, { vehicle_type: 0 }]),
      buildings: ok([{ building_type: 8888, caption: "PRIVATE BUILDING" }]),
      allianceBuildings: ok([{ building_type: 8888, specialization: { type: "new_type" } }]),
      schoolings: ok({ result: null }),
      credits: ok({ user_name: "PRIVATE PLAYER" }),
      missions: { ok: false, error: "HTTP 503 https://meldkamerspel.com?_session_id=SECRET&x=1" },
      allianceEvents: { ok: false, error: "HTTP 401" },
    }),
    updateStatus: { state: "error", message: "Update HTTP 502" },
    errors: ["Instelling ongeldig"],
  });
  assert.match(result, /onbekend voertuigtype 9999 \(2 keer\)/);
  assert.match(result, /Gebouwen .*onbekend gebouwtype 8888/);
  assert.match(result, /Teamgebouwen .*onbekend gebouwtype 8888/);
  assert.match(result, /onbekende specialisatie new_type/);
  assert.match(result, /record 3: verwerkingsfout/);
  assert.match(result, /Opleidingen .*verwerkingsfout/);
  assert.match(result, /HTTP 503/);
  assert.match(result, /HTTP 401/);
  assert.match(result, /Update HTTP 502/);
  assert.match(result, /Instelling ongeldig/);
  assert.match(result, /31-10-2026, 13:00:00/);
  assert.doesNotMatch(result, /PRIVATE|SECRET|onbekend voertuigtype 0/);
});

test("error reports distinguish unavailable snapshots from valid empty data and expose the settings action", () => {
  reports.clearReportIssues();
  assert.match(reports.generateErrorReport(reportInput()), /nog geen dashboardgegevens/i);
  const report = reports.generateErrorReport(reportInput({ vehicles: ok([]), buildings: ok([]), schoolings: ok({ result: [] }) }));
  assert.match(report, /Huidige bevindingen \(0\)/);
  assert.match(report, /Geen problemen gevonden/);
  assert.match(render(reportPanel.ErrorReportPanel, { ...reportInput(), errors: [] }), /Genereer error rapport/);
});

test("reported reference failures clear on recovery and session errors clear on logout", async () => {
  reports.clearReportIssues();
  const previousWindow = globalThis.window;
  try {
    globalThis.window = { mksDashboard: { loadReference: async () => ({ ok: false, error: "Reference HTTP 503" }) } };
    await reports.loadReportedReference("missions:nl_NL");
    reports.recordAppIssue("Runtime", new Error("Runtime issue"));
    assert.match(reports.generateErrorReport(reportInput()), /missions:nl_NL: Reference HTTP 503/);
    assert.match(reports.generateErrorReport(reportInput()), /Runtime issue/);
    globalThis.window.mksDashboard.loadReference = async () => ok([]);
    await reports.loadReportedReference("missions:nl_NL");
    assert.doesNotMatch(reports.generateErrorReport(reportInput()), /Reference HTTP 503/);
    globalThis.window.mksDashboard.loadReference = async () => { throw new Error("IPC failed"); };
    await assert.rejects(reports.loadReportedReference("suggestions"), /IPC failed/);
    assert.match(reports.generateErrorReport(reportInput()), /suggestions: IPC failed/);
    reports.clearReportIssues();
    assert.doesNotMatch(reports.generateErrorReport(reportInput()), /Runtime issue|IPC failed/);
  } finally {
    globalThis.window = previousWindow;
    reports.clearReportIssues();
  }
});

test("report redaction handles query, encoded separator and JSON-style SessionID fields", () => {
  for (const message of ['?_session_id=SECRET&x=1', 'sessionid: SECRET', '"session_id":"SECRET"', '_session_id%3DSECRET']) {
    assert.doesNotMatch(reports.reportMessage(message), /SECRET/);
    assert.match(reports.reportMessage(message), /afgeschermd/);
  }
});

test("native report save writes the exact text and handles cancel, invalid sender and filesystem errors", async () => {
  const folder = await mkdtemp(join(tmpdir(), "mks-report-test-"));
  try {
    const handlers = new Map();
    const sender = { setWindowOpenHandler() {}, on() {} };
    const owner = { webContents: sender, loadFile: async () => {}, loadURL: async () => {} };
    let selection = { canceled: false, filePath: join(folder, "report.txt") };
    const BrowserWindow = function () { return owner; };
    BrowserWindow.fromWebContents = () => owner;
    const app = {
      isPackaged: false, getVersion: () => "0.1.0", getPath: () => folder,
      setName() {}, setPath() {}, setAppUserModelId() {}, on() {},
      whenReady: () => ({ then: (callback) => callback() }),
    };
    await loadModule("src/main/index.ts", {
      electron: { app, BrowserWindow, ipcMain: { handle: (key, handler) => handlers.set(key, handler) },
        dialog: { showSaveDialog: async () => selection } },
      "electron-updater": { autoUpdater: {} },
    });
    const save = handlers.get("report:save");
    const report = "MKS Dashboard - errorrapport\nOnbekend voertuigtype 9999\n";
    assert.equal(await save({ sender }, report), true);
    assert.equal(await readFile(selection.filePath, "utf8"), report);
    selection = { canceled: true };
    assert.equal(await save({ sender }, report), false);
    await assert.rejects(save({ sender: {} }, report), /niet afkomstig/);
    await assert.rejects(save({ sender }, ""), /geldige tekst/);
    await assert.rejects(save({ sender }, {}), /geldige tekst/);
    selection = { canceled: false };
    await assert.rejects(save({ sender }, report), /bestandslocatie/);
    selection = { canceled: false, filePath: join(folder, "missing", "report.txt") };
    await assert.rejects(save({ sender }, report), /ENOENT/);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test("refresh intervals default to five minutes and never refresh before the configured threshold", () => {
  assert.equal(refreshInterval.defaultRefreshMinutes, 5);
  assert.equal(refreshInterval.parseRefreshMinutes("5"), 5);
  assert.equal(refreshInterval.parseRefreshMinutes("1"), 1);
  for (const value of ["", "0", "-1", "1.5", "NaN", "Infinity", "9007199254740992"]) {
    assert.throws(() => refreshInterval.parseRefreshMinutes(value), /minimaal 1/);
  }
  assert.equal(refreshInterval.refreshDue(1000, 300999, 5), false);
  assert.equal(refreshInterval.refreshDue(1000, 301000, 5), true);
  assert.equal(refreshInterval.refreshDue(1000, 301000, 10), false);
});

test("schoolings support API result wrappers and show actual course fields for own and team data", () => {
  const course = { id: 1, education_title: "Duikopleiding", building_id: 7, running: true,
    open_spaces: 0, finish_time: "2026-10-31T12:00:00Z" };
  for (const alliance of [false, true]) {
    for (const payload of [[course], { result: [course] }]) {
      const html = render(pages.SchoolingsPage, { result: ok(payload), alliance });
      assert.match(html, /Duikopleiding/);
      assert.match(html, /31-10-2026/);
      assert.match(html, /Vrije plaatsen/);
      assert.equal(html.includes("Deelnemers"), false);
      assert.equal(html.includes("Niet beschikbaar"), false);
      assert.match(html, /<td>0<\/td><td>Ja<\/td>/);
      assert.equal(html.includes('role="alert"'), false);
    }
  }
  assert.equal(schoolings.schoolingRecords({ result: Array(501).fill(course) }).length, 501);
  assert.match(render(pages.SchoolingsPage, { result: ok({ result: [] }), alliance: true }), /Geen resultaten/);
  for (const payload of [{}, { result: null }, { result: {} }, { result: [null] }]) {
    assert.throws(() => schoolings.schoolingRecords(payload), /ongeldig|geldige lijst/);
    assert.match(render(pages.SchoolingsPage, { result: ok(payload) }), /role="alert"/);
  }
});

test("navigation hides account pages when logged out and keeps Dev options independent", () => {
  const accountPages = navigation.navigationPages.filter((item) => !infoblocks.isInfoblockPage(item.key));
  for (const { key } of accountPages) {
    assert.equal(navigation.pageAllowed(key, false, "dev", true, true), false);
    assert.equal(navigation.pageAllowed(key, true, "stable", false, false), true);
  }
  assert.equal(navigation.pageAllowed("overview", false, "stable", false, false), true);
  assert.equal(navigation.pageAllowed("settings", false, "dev", false, false), true);
  assert.equal(navigation.pageAllowed("settings", false, "stable", false, false), true);
  assert.equal(navigation.pageAllowed("settings", true, "stable", true, true), true);
  assert.equal(navigation.pageAllowed("settings", false, undefined, false, false), true);
  for (const key of [...infoblocks.infoblockPages, "rawResponses"]) {
    assert.equal(navigation.pageAllowed(key, false, "dev", true, true), true);
    assert.equal(navigation.pageAllowed(key, true, "stable", true, true), false);
    assert.equal(navigation.pageAllowed(key, true, "dev", false, false), false);
  }
});

test("web-style groups contain unique known pages and keep team pages together", () => {
  const grouped = navigation.navigationGroups.flatMap((group) => group.pages);
  assert.equal(new Set(grouped).size, grouped.length);
  for (const key of grouped) assert.ok(navigation.navigationPages.some((item) => item.key === key));
  assert.deepEqual(navigation.navigationGroups.find((group) => group.label === "Team").pages,
    ["allianceInfo", "allianceBuildings", "teamHospitals", "teamCells", "allianceSchoolings"]);
});

test("account usernames use the API field and the same fallback as account details", () => {
  for (const [payload, expected] of [
    [{ user_name: " Speler ", name: "Andere naam" }, "Speler"],
    [{ name: "Legacyspeler" }, "Legacyspeler"],
    [{ user_name: 42 }, null], [{ user_name: " " }, null], [[], null], [null, null],
  ]) {
    assert.equal(pages.accountUsername(ok(payload)), expected);
  }
  assert.equal(pages.accountUsername(undefined), null);
  assert.equal(pages.accountUsername({ ok: false, error: "HTTP 503" }), null);
  assert.match(render(pages.AccountPage, { result: ok({ user_name: "Speler" }) }), /Speler/);
});

test("account balances use real userinfo fields, preserve zero and support legacy data", () => {
  const html = render(pages.AccountPage, { result: ok({
    user_name: "Speler", credits_user_current: 123456, coins_user_current: 0, credits_user_total: 987654,
    credits: 111, coins: 222, credits_total: 333,
    user_toplist_position: 1234, user_level_title: "Hoofdcentralist",
  }) });
  assert.match(html, />123\.456</);
  assert.match(html, />987\.654</);
  assert.match(html, />Coins<\/td><td>0</);
  assert.match(html, />Plek op ranglijst<\/td><td>1\.234</);
  assert.match(html, />Rang<\/td><td>Hoofdcentralist</);
  assert.equal(html.includes("Niet beschikbaar"), false);
  const legacy = render(pages.AccountPage, { result: ok({ name: "Speler", credits: 123, coins: 4, credits_total: 567 }) });
  assert.match(legacy, />123</);
  assert.match(legacy, />567</);
  assert.match(legacy, />Plek op ranglijst<\/td><td>Niet beschikbaar</);
  assert.match(legacy, />Rang<\/td><td>Niet beschikbaar</);
  assert.match(render(pages.AccountPage, { result: ok({ user_name: "Speler" }) }), /Niet beschikbaar/);
});

test("raw responses preserve complete JSON, show the request URL and escape API content", () => {
  const payload = Array.from({ length: 501 }, (_, id) => ({ id, caption: id === 500 ? "<script>last</script>" : "Voertuig" }));
  const data = { vehicles: { ...ok(payload), requestUrl: "https://meldkamerspel.com/api/vehicles?_session_id=[afgeschermd]" } };
  const html = render(rawPages.RawResponsesPage, { data });
  assert.match(html, /https:\/\/meldkamerspel.com\/api\/vehicles\?_session_id=\[afgeschermd\]/);
  assert.match(html, /&quot;id&quot;: 500/);
  assert.match(html, /&lt;script&gt;last&lt;\/script&gt;/);
  assert.equal(html.includes("<script>"), false);
  assert.match(html, /value="allianceEvents"/);
});

test("account numbers returned as strings use Dutch thousands and decimal separators", () => {
  const html = render(pages.AccountPage, { result: ok({
    user_name: "27063", credits_user_current: "27063", coins_user_current: "0",
    credits_user_total: "1234567.5", user_toplist_position: "1234", user_level_title: "12345",
  }) });
  assert.match(html, />Credits<\/td><td>27\.063</);
  assert.match(html, />Coins<\/td><td>0</);
  assert.match(html, />Totaal verdiende credits<\/td><td>1\.234\.567,5</);
  assert.match(html, />Plek op ranglijst<\/td><td>1\.234</);
  assert.match(html, />Naam<\/td><td>27063</);
  assert.match(html, />Rang<\/td><td>12345</);
});

test("raw responses explicitly present missing data, empty successes and failed requests", () => {
  assert.match(render(rawPages.RawResponsesPage, { data: null }), /Klik op Gegevens ophalen/);
  assert.match(render(rawPages.RawResponsesPage, { data: { vehicles: ok([]) } }), />\[\]<\/pre>/);
  const failure = render(rawPages.RawResponsesPage, {
    data: { vehicles: { ok: false, error: "De game-API gaf HTTP 503 terug.", requestUrl: "https://meldkamerspel.com/api/vehicles" } },
  });
  assert.match(failure, /role="alert"/);
  assert.match(failure, /HTTP 503/);
  assert.equal(failure.includes("<pre"), false);
});

test("infoblocks require Dev and explicit opt-in, and classify all ten public pages", () => {
  assert.equal(infoblocks.infoblocksAllowed("dev", true), true);
  assert.equal(infoblocks.infoblocksAllowed("dev", false), false);
  assert.equal(infoblocks.infoblocksAllowed("stable", true), false);
  assert.equal(infoblocks.infoblocksAllowed(undefined, true), false);
  assert.equal(infoblocks.infoblockPages.length, 10);
  for (const page of ["vehicles", "buildings", "allianceBuildings", "progressdata", "credits", "allianceInfo", "settings"]) {
    assert.equal(infoblocks.isInfoblockPage(page), false);
  }
  for (const page of infoblocks.infoblockPages) assert.equal(infoblocks.isInfoblockPage(page), true);
});

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

test("missing team nicknames stay blank while configured nicknames remain visible", () => {
  for (const caption of [undefined, null, "", "Bijnaam"]) {
    const html = render(pages.AlliancePage, { result: ok({
      id: 7, name: "Demoteam", users: [{ name: "Speler", caption, roles: [] }],
    }) });
    assert.ok(html.includes(`<td>Speler</td><td>${caption ?? ""}</td>`));
  }
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
