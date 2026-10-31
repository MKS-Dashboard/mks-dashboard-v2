import { useEffect, useState } from "react";
import {
  gameLocales, type DashboardResourceResult, type ReferenceKey,
} from "../../shared/contracts";
import { Failure, read, Table } from "./DashboardPages";
import { parseBuildings, capacityOverview, type Building } from "./dashboard-model";
import specializations from "./data/specializations.json";
import { schoolingRecords } from "./schoolings";
import { loadReportedReference } from "./error-report";

type Scalar = string | number;
type Row = { cells: Scalar[]; url?: string };
const format = (value: Scalar) => typeof value === "number" ? value.toLocaleString("nl-NL", { maximumFractionDigits: 2 }) : value;

export function DataTable({ title, headers, rows, linkColumn, initialColumn = 0, initialDescending = false }: {
  title: string; headers: string[]; rows: Row[]; linkColumn?: number; initialColumn?: number; initialDescending?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ column: initialColumn, descending: initialDescending });
  const [linkError, setLinkError] = useState("");
  const visible = rows.filter((row) => row.cells.some((cell) =>
    String(cell).toLocaleLowerCase("nl").includes(search.trim().toLocaleLowerCase("nl"))))
    .sort((a, b) => {
      const left = a.cells[sort.column];
      const right = b.cells[sort.column];
      const value = typeof left === "number" && typeof right === "number"
        ? left - right : String(left).localeCompare(String(right), "nl", { numeric: true });
      return sort.descending ? -value : value;
    });
  async function open(url: string) {
    setLinkError("");
    try { await window.mksDashboard.openExternal(url); }
    catch (cause) { setLinkError(cause instanceof Error ? cause.message : "De link kon niet worden geopend."); }
  }
  return <section className="data-panel report-table">
    <div className="data-toolbar"><div><h2>{title}</h2><p>{visible.length.toLocaleString("nl-NL")} resultaten</p></div>
      <input type="search" className="search-input" aria-label={`Zoeken in ${title}`} placeholder="Zoeken..."
        value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    {linkError && <Failure message={linkError} />}
    {visible.length === 0 ? <div className="empty-state">Geen resultaten gevonden.</div> :
      <div className="table-scroll"><table><thead><tr>{headers.map((header, column) =>
        <th key={header} aria-sort={sort.column !== column ? "none" : sort.descending ? "descending" : "ascending"}>
          <button className="table-sort" onClick={() => setSort({
            column, descending: sort.column === column ? !sort.descending : false,
          })}>{header}{sort.column === column ? sort.descending ? " ↓" : " ↑" : ""}</button>
        </th>)}</tr></thead><tbody>{visible.map((row, index) =>
          <tr key={index}>{row.cells.map((cell, column) => <td key={column}>
            {column === linkColumn && row.url ? <button className="text-link" onClick={() => {
              if (row.url) void open(row.url);
            }}>{format(cell)}</button> : format(cell)}
          </td>)}</tr>)}</tbody></table></div>}
  </section>;
}

function record(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("De gegevens hebben een ongeldig formaat.");
  return data as Record<string, unknown>;
}
function list(data: unknown): unknown[] {
  if (!Array.isArray(data)) throw new Error("De gegevens bevatten geen lijst.");
  return data;
}
function scalar(value: unknown): Scalar {
  return typeof value === "string" || typeof value === "number" && Number.isFinite(value) ? value : "Niet beschikbaar";
}
function accountNumber(value: unknown): Scalar {
  if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim())) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return scalar(value);
}
function yes(value: unknown): string {
  return value === true ? "Ja" : value === false ? "Nee" : "Niet beschikbaar";
}

export function accountUsername(result: DashboardResourceResult | undefined): string | null {
  if (!result?.ok || !result.data || typeof result.data !== "object" || Array.isArray(result.data)) return null;
  const account = record(result.data);
  const name = account.user_name ?? account.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function AccountPage({ result }: { result: DashboardResourceResult }) {
  const parsed = read(result, record);
  if (!parsed.ok) return <Failure message={parsed.error} />;
  const fields: [string, string, string?][] = [
    ["Naam", "user_name"], ["Credits", "credits_user_current", "credits"],
    ["Coins", "coins_user_current", "coins"], ["Totaal verdiende credits", "credits_user_total", "credits_total"],
    ["Plek op ranglijst", "user_toplist_position"], ["Rang", "user_level_title"],
  ];
  return <Table title="Accountgegevens" headers={["Gegeven", "Waarde"]} rows={fields.map(([label, key, legacyKey]) =>
    [label, key === "user_name" ? accountUsername(result) ?? "Niet beschikbaar" :
      format((key === "user_level_title" ? scalar : accountNumber)(
        parsed.value[key] ?? (legacyKey ? parsed.value[legacyKey] : undefined)))])} />;
}

export function AlliancePage({ result }: { result: DashboardResourceResult }) {
  const parsed = read(result, (data) => {
    const team = record(data);
    if (team.id == null) throw new Error("Je account heeft geen beschikbare teamgegevens.");
    const users = list(team.users).map((item): Row => {
      const user = record(item);
      return { cells: [scalar(user.name), user.caption == null ? "" : scalar(user.caption), list(user.roles).map(scalar).join(", ")] };
    });
    return { team, users };
  });
  if (!parsed.ok) return <Failure message={parsed.error} />;
  const { team, users } = parsed.value;
  return <div className="report-page">
    <Table title="Teamgegevens" headers={["Gegeven", "Waarde"]} rows={[
      ["Naam", scalar(team.name)], ["Team-ID", format(scalar(team.id))],
      ["Plaats in ranglijst", format(scalar(team.rank))],
      ["Totaal verdiende credits", format(scalar(team.credits_total))],
      ["Teamkas ingeschakeld", yes(team.finance_active)], ["Actuele inhoud teamkas", format(scalar(team.credits_current))],
    ]} />
    <DataTable title={`Teamleden (${users.length})`} headers={["Naam", "Bijnaam", "Rollen"]} rows={users} />
  </div>;
}

export function BuildingDetailsPage({ result, kind, alliance = false }: {
  result: DashboardResourceResult; kind: "hospitals" | "cells" | "specializations"; alliance?: boolean;
}) {
  const parsed = read(result, parseBuildings);
  if (!parsed.ok) return <Failure message={parsed.error} />;
  const name = (building: Building) => building.name ?? (building.id == null ? "Naam niet beschikbaar" : `Gebouw ${building.id}`);
  if (kind === "specializations") {
    const groups = new Map<string, Building[]>();
    for (const building of parsed.value) {
      if (!building.specialization) continue;
      const rows = groups.get(building.specialization) ?? [];
      rows.push(building);
      groups.set(building.specialization, rows);
    }
    return <div className="report-page">{groups.size === 0 ? <div className="empty-state">Geen gespecialiseerde gebouwen.</div> :
      [...groups].map(([type, buildings]) => <DataTable key={type}
        title={`${specializations.find((item) => item.type === type)?.name ?? type} (${buildings.length})`}
        headers={["Gebouw-ID", "Naam", "Actief"]} rows={buildings.map((building) => ({
          cells: [scalar(building.id), name(building), yes(building.specializationActive)],
        }))} />)}</div>;
  }
  const selected = parsed.value.filter((building) => building.type === (kind === "hospitals" ? 2 : alliance ? 12 : 5));
  return <DataTable title={`${alliance ? "Team" : "Eigen"} ${kind === "hospitals" ? "ziekenhuizen" : "cellen"}`}
    headers={["Naam", kind === "hospitals" ? "Bedden" : "Cellen", "In gebruik", "Vrij"]}
    rows={selected.map((building) => {
      const overview = capacityOverview([building], alliance);
      const capacity = kind === "hospitals" ? overview.beds : overview.cells;
      return { cells: [name(building), capacity.total, capacity.used, Math.max(0, capacity.total - capacity.used)] };
    })} />;
}

export function SchoolingsPage({ result, alliance = false }: { result: DashboardResourceResult; alliance?: boolean }) {
  const parsed = read(result, (data) => schoolingRecords(data).map((schooling): Row => {
    const end = schooling.finish_time ?? schooling.ends_at ?? schooling.end_time;
    const timestamp = typeof end === "number" ? end * 1000 : typeof end === "string" ? Date.parse(end) : NaN;
    return { cells: [
      scalar(schooling.education_title ?? schooling.caption ?? schooling.name ?? schooling.schooling_type ?? schooling.id),
      scalar(schooling.building_id),
      scalar(schooling.open_spaces), yes(schooling.running),
      Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString("nl-NL") : scalar(end),
    ] };
  }));
  return parsed.ok ? <DataTable title={alliance ? "Teamopleidingen" : "Opleidingen"}
    headers={["Opleiding", "Gebouw", "Vrije plaatsen", "Gestart", "Einddatum"]} rows={parsed.value} /> : <Failure message={parsed.error} />;
}

function useReference(key: ReferenceKey) {
  const [result, setResult] = useState<DashboardResourceResult | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setResult(null);
    void loadReportedReference(key).then((data) => { if (active) setResult(data); })
      .catch((cause: unknown) => { if (active) setResult({ ok: false, error: cause instanceof Error ? cause.message : "Gegevens ophalen is mislukt." }); });
    return () => { active = false; };
  }, [key, reload]);
  return { result, refresh: () => setReload((value) => value + 1) };
}

export function SuggestionsPage() {
  const { result, refresh } = useReference("suggestions");
  const [error, setError] = useState("");
  const parsed = result ? read(result, (data) => list(data).filter((item) => !("pull_request" in record(item))).map((item) => {
    const issue = record(item);
    if (typeof issue.number !== "number") throw new Error("Een GitHub-suggestie heeft geen geldig nummer.");
    const labels = list(issue.labels).map((label) => String(scalar(record(label).name)));
    return { number: issue.number, title: scalar(issue.title), labels };
  })) : null;
  async function newIssue() {
    try { await window.mksDashboard.openExternal("https://github.com/MKS-Dashboard/mks-dashboard.github.io/issues/new"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "De link kon niet worden geopend."); }
  }
  const rows = parsed?.ok ? parsed.value.map((issue): Row => ({
    cells: [issue.number, issue.title, issue.labels.join(", "), "Info / reageren"],
    url: `https://github.com/MKS-Dashboard/mks-dashboard.github.io/issues/${issue.number}`,
  })) : [];
  return <div className="report-page">
    <div className="section-heading"><div><h2>Suggesties en foutmeldingen</h2><p>Openstaande GitHub-issues van de webapp; pull requests zijn uitgefilterd.</p></div>
      <button className="button button-secondary" onClick={refresh}>Vernieuwen</button>
      <button className="button button-primary" onClick={() => void newIssue()}>Suggestie melden</button></div>
    {error && <Failure message={error} />}
    {!parsed ? <div role="status">Suggesties ophalen...</div> : !parsed.ok ? <Failure message={parsed.error} /> : <>
      <DataTable title="Openstaande issues" headers={["Nummer", "Titel", "Labels", "Info / reageren"]} rows={rows} linkColumn={3} />
      <DataTable title="Volgende update (webapp)" headers={["Nummer", "Titel"]} rows={parsed.value
        .filter((issue) => issue.labels.includes("Next Update")).map((issue) => ({ cells: [issue.number, issue.title] }))} />
    </>}
  </div>;
}

export function creditStatistics(data: unknown) {
  const missions = list(data).map((item) => {
    const mission = record(item);
    const additional = record(mission.additional);
    if (typeof mission.average_credits !== "number" || !Number.isFinite(mission.average_credits)) {
      throw new Error("Een missie heeft geen geldige creditwaarde.");
    }
    return { credits: mission.average_credits, alliance: additional.only_alliance_mission === true, planned: additional.guard_mission === true };
  });
  const stats = (items: typeof missions): Scalar[] => [items.length, items.length ?
    items.reduce((sum, item) => sum + item.credits, 0) / items.length : "Geen missies"];
  return [
    ...stats(missions.filter((mission) => !mission.alliance && !mission.planned)),
    ...stats(missions.filter((mission) => mission.planned)),
    ...stats(missions.filter((mission) => mission.alliance)),
  ];
}

export function CreditsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [timestamp, setTimestamp] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setRows([]); setErrors([]); setTimestamp("");
    void (async () => {
      const results: Row[] = [];
      const failures: string[] = [];
      const updated = await loadReportedReference("missionUpdate");
      if (updated.ok) {
        const parsed = read(updated, (data) => scalar(record(record(record(record(data).commit).commit).author).date));
        if (parsed.ok && active) setTimestamp(String(parsed.value));
        else if (!parsed.ok) failures.push(parsed.error);
      } else failures.push(updated.error);
      for (let index = 0; index < gameLocales.length; index += 4) {
        if (!active) return;
        await Promise.all(gameLocales.slice(index, index + 4).map(async (locale) => {
          const result = await loadReportedReference(`missions:${locale}`);
          const parsed = read(result, creditStatistics);
          if (parsed.ok) results.push({ cells: [locale, ...parsed.value] });
          else failures.push(`${locale}: ${parsed.error}`);
        }));
        if (active) { setRows([...results]); setErrors([...failures]); }
      }
      if (active) setLoading(false);
    })().catch((cause: unknown) => {
      if (active) { setErrors([cause instanceof Error ? cause.message : "Credits ophalen is mislukt."]); setLoading(false); }
    });
    return () => { active = false; };
  }, [reload]);
  return <div className="report-page">
    <div className="section-heading"><div><h2>Credits per spelversie</h2><p>Vergelijk missieaantallen en gemiddelde opbrengsten, zoals in de webapp.</p>
      {timestamp && <p>Bron bijgewerkt: {new Date(timestamp).toLocaleString("nl-NL")}</p>}</div>
      <button className="button button-secondary" disabled={loading} onClick={() => setReload((value) => value + 1)}>Vernieuwen</button></div>
    {loading && <div role="status">Spelversies ophalen ({rows.length}/{gameLocales.length})...</div>}
    {errors.map((error) => <Failure key={error} message={error} />)}
    <DataTable title="Missieopbrengsten" headers={["Spelversie", "Missies", "Gemiddelde credits", "Geplande missies", "Gemiddelde gepland", "Teammissies", "Gemiddelde team"]}
      rows={rows} initialColumn={2} initialDescending />
  </div>;
}
