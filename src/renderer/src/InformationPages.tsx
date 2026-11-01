import { useEffect, useState, type ReactNode } from "react";
import { recordAppIssue } from "./error-report";
import type { DashboardResourceResult } from "../../shared/contracts";
import {
  informationCatalog as catalog, informationSource, parseMissions, parseMissionEvents, filterMissions,
  missionFlags, eventMissions, poiUsage, fieldLabel,
  type Mission, type Fields, type MissionFilter,
} from "./data/information-model";

type ResourceProps = { result: DashboardResourceResult };
const count = (value: number) => value.toLocaleString("nl-NL");
const matches = (text: string, search: string) => text.toLocaleLowerCase("nl").includes(search.trim().toLocaleLowerCase("nl"));

function read<T>(result: DashboardResourceResult, parser: (value: unknown) => T) {
  if (!result.ok) return result;
  try { return { ok: true as const, value: parser(result.data) }; }
  catch (cause) {
    return { ok: false as const, error: cause instanceof Error ? cause.message : "De informatie kon niet worden verwerkt." };
  }
}
function Failure({ error }: { error: string }) {
  useEffect(() => { recordAppIssue("Informatiepagina", error); }, [error]);
  return <div className="notice notice-error" role="alert">{error}</div>;
}
function Search({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return <input className="search-input" type="search" aria-label={label} placeholder={label}
    value={value} onChange={(event) => onChange(event.target.value)} />;
}
function Source({ missions = false }: { missions?: boolean }) {
  const [error, setError] = useState("");
  return <div><p className="information-source">Bron: {missions ? "Meldkamerspel / Missionfiles (nl_NL); " : ""}
    <a href={informationSource} onClick={(event) => {
      event.preventDefault();
      setError("");
      void window.mksDashboard.openExternal(informationSource).catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "De bron kon niet worden geopend."));
    }}>MKS-Dashboard, feitelijke spelgegevens</a>.
    {missions && " De catalogus bevat mogelijke inzetten, geen actieve meldingen."}</p>
    {error && <Failure error={error} />}</div>;
}
function Table({ title, headers, rows, empty = "Geen resultaten gevonden." }: {
  title: string; headers: ReactNode[]; rows: ReactNode[][]; empty?: string;
}) {
  return <section className="data-panel report-table">
    <div className="data-toolbar"><h2>{title}</h2></div>
    {rows.length === 0 ? <div className="empty-state">{empty}</div> :
      <div className="table-scroll"><table><thead><tr>{headers.map((header, i) =>
        <th key={i}>{header}</th>)}</tr></thead><tbody>{rows.map((row, i) =>
        <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}
  </section>;
}
function FieldValue({ value, group }: { value: unknown; group: string }): ReactNode {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Ja" : "Nee";
  if (typeof value === "number") return count(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return <ul>{value.map((item, i) =>
    <li key={i}><FieldValue value={item} group={group} /></li>)}</ul>;
  if (typeof value === "object") return <ul>{Object.entries(value).map(([key, item]) =>
    <li key={key}>{fieldLabel(group, key, item)}: <FieldValue value={item} group={group} /></li>)}</ul>;
  return "Onbekende waarde";
}
function MissionFields({ fields, group, title, excluded }: {
  fields: Fields; group: string; title: string; excluded: readonly string[];
}) {
  const entries = Object.entries(fields).filter(([key]) => !excluded.includes(key))
    .sort((a, b) => typeof a[1] === "number" && typeof b[1] === "number" ? b[1] - a[1] : a[0].localeCompare(b[0], "nl"));
  return entries.length === 0 ? null : <div><strong>{title}</strong><ul>{entries.map(([key, value]) =>
    <li key={key}>{fieldLabel(group, key, value)}: <FieldValue value={value}
      group={key === "personnel_educations" ? "personnel_educations" : group} />
      {group === "chances" && typeof value === "number" ? "%" : ""}</li>)}</ul></div>;
}
function MissionDetails({ mission, alliance }: { mission: Mission; alliance: boolean }) {
  const excluded = alliance ? catalog.exclusions.allianceMissions : catalog.exclusions.missions;
  return <details className="mission-details"><summary>Benodigdheden en overige informatie</summary>
    {mission.places.length > 0 && <p>POI: {mission.places.join(", ")}</p>}
    <MissionFields fields={mission.requirements} group="requirements" title="Benodigdheden" excluded={excluded} />
    <MissionFields fields={mission.additional} group="additional" title="Overige" excluded={excluded} />
    <MissionFields fields={mission.chances} group="chances" title="Kansen" excluded={excluded} />
    <MissionFields fields={mission.prerequisites} group="prerequisites" title="Voorwaarden voor generatie" excluded={[]} />
  </details>;
}
function MissionTable({ title, missions, alliance = false }: { title: string; missions: Mission[]; alliance?: boolean }) {
  const [page, setPage] = useState(0);
  const lastPage = Math.max(0, Math.ceil(missions.length / 50) - 1);
  const current = Math.min(page, lastPage);
  return <div>
    <Table title={`${title} (${count(missions.length)})`} headers={["ID", "Naam", "Credits gemiddeld", "Info"]}
      rows={missions.slice(current * 50, (current + 1) * 50).map((mission) => [
        mission.id, mission.name, count(mission.credits), <MissionDetails mission={mission} alliance={alliance} />,
      ])} />
    {lastPage > 0 && <nav className="information-pagination" aria-label={`Paginering ${title}`}>
      <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>Vorige</button>
      <span role="status">Pagina {current + 1} van {lastPage + 1}</span>
      <button type="button" disabled={current === lastPage} onClick={() => setPage(current + 1)}>Volgende</button>
    </nav>}
  </div>;
}
function MissionCatalog({ result, alliance, planned = false }: ResourceProps & { alliance: boolean; planned?: boolean }) {
  const initialFilter = (): MissionFilter => ({
    search: "", minCredits: "", maxCredits: "", flags: planned ? { guard_mission: "true" } : {},
  });
  const [filter, setFilter] = useState<MissionFilter>(initialFilter);
  const parsed = read(result, parseMissions);
  if (!parsed.ok) return <Failure error={parsed.error} />;
  const missions = parsed.value.filter((mission) =>
    (!alliance || mission.additional.only_alliance_mission === true) &&
    (!planned || mission.additional.guard_mission === true));
  const shown = filterMissions(missions, filter);
  const title = planned ? "Geplande inzetten" : alliance ? "Teaminzetten" : "Inzetten";
  return <div className="report-page information-page">
    <div className="section-heading"><div><h2>{title}</h2>
      <p>Doorzoek alle inzetvarianten en bekijk de benodigde voertuigen, opleidingen en kansen.</p></div>
      <Search value={filter.search} onChange={(search) => setFilter({ ...filter, search })} label="Zoek naam, ID of POI..." />
    </div>
    <div className="information-filters">
      <label>Meer credits dan <input type="number" min="0" value={filter.minCredits}
        onChange={(event) => setFilter({ ...filter, minCredits: event.target.value })} /></label>
      <label>Minder credits dan <input type="number" min="0" value={filter.maxCredits}
        onChange={(event) => setFilter({ ...filter, maxCredits: event.target.value })} /></label>
      {missionFlags.filter(({ key }) => (!alliance || key !== "only_alliance_mission") &&
        (!planned || key !== "guard_mission")).map(({ key, label }) =>
        <label key={key}>{label} <select value={filter.flags[key] ?? "all"}
          onChange={(event) => setFilter({ ...filter, flags: { ...filter.flags, [key]: event.target.value } })}>
          <option value="all">Alle</option><option value="true">Ja</option><option value="false">Nee</option>
        </select></label>)}
      <button type="button" onClick={() => setFilter(initialFilter())}>Filters wissen</button>
    </div>
    <MissionTable key={JSON.stringify(filter)} title={title} missions={shown} alliance={alliance} />
    <Source missions />
  </div>;
}
export function MissionsPage(props: ResourceProps) { return <MissionCatalog {...props} alliance={false} />; }
export function PlannedMissionsPage(props: ResourceProps) { return <MissionCatalog {...props} alliance={false} planned />; }
export function AllianceMissionsPage(props: ResourceProps) { return <MissionCatalog {...props} alliance />; }

export function EventsPage({ result }: ResourceProps) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const parsed = read(result, parseMissions);
  if (!parsed.ok) return <Failure error={parsed.error} />;
  const events = catalog.events.filter((event) => event.keys.includes(category))
    .map((event) => ({
      name: event.name, missions: eventMissions(parsed.value, event.mission_ids)
        .filter((mission) => matches(`${event.name} ${mission.name} ${mission.id}`, search)),
    })).sort((a, b) => a.name.localeCompare(b.name, "nl"));
  return <div className="report-page information-page">
    <div className="section-heading"><div><h2>Events</h2><p>Feestdagen, seizoenen en tijdelijke spelactiviteiten.</p></div>
      <Search value={search} onChange={setSearch} label="Zoek event of inzet..." />
    </div>
    <label>Eventcategorie <select value={category} onChange={(event) => setCategory(event.target.value)}>
      {[...catalog.eventCategories].sort((a, b) => a.name.localeCompare(b.name, "nl"))
        .map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
    </select></label>
    {events.filter((event) => !search || event.missions.length > 0 || matches(event.name, search))
      .map((event) => <MissionTable key={`${event.name}:${search}`} title={event.name} missions={event.missions} />)}
    {events.every((event) => event.missions.length === 0) && <div className="empty-state">Geen bijbehorende eventinzetten in deze catalogus.</div>}
    <Source missions />
  </div>;
}
export function AllianceEventsPage({ result, missionsResult }: ResourceProps & { missionsResult: DashboardResourceResult }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("all");
  const events = read(result, parseMissionEvents);
  const missions = read(missionsResult, parseMissions);
  if (!events.ok) return <Failure error={events.error} />;
  if (!missions.ok) return <Failure error={missions.error} />;
  const groups = events.value.filter((event) => selected === "all" || event.id === selected)
    .map((event) => ({ ...event, missions: eventMissions(missions.value, event.missionIds)
      .filter((mission) => matches(`${event.name} ${mission.name} ${mission.id}`, search)) }));
  return <div className="report-page information-page">
    <div className="section-heading"><div><h2>Teamevents</h2><p>Inzetten die horen bij de teamevents in het spel.</p></div>
      <Search value={search} onChange={setSearch} label="Zoek teamevent of inzet..." />
    </div>
    <label>Teamevent <select value={selected} onChange={(event) => setSelected(event.target.value)}>
      <option value="all">Alle</option>{events.value.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
    </select></label>
    {groups.filter((event) => !search || event.missions.length > 0 || matches(event.name, search))
      .map((event) => <MissionTable key={`${event.id}:${search}`} title={event.name} missions={event.missions} alliance />)}
    {groups.every((event) => event.missions.length === 0) && <div className="empty-state">Geen bijbehorende teameventinzetten gevonden.</div>}
    <Source missions />
  </div>;
}
export function AwardsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  return <div className="report-page information-page">
    <div className="section-heading"><div><h2>Awards</h2><p>Doelen voor brons, zilver en goud; geen persoonlijke voortgang.</p></div>
      <Search value={search} onChange={setSearch} label="Zoek award..." />
    </div>
    <label>Awardtype <select value={type} onChange={(event) => setType(event.target.value)}>
      <option value="all">Alle</option><option value="Doorlopend">Doorlopend</option><option value="Eenmalig">Eenmalig</option>
    </select></label>
    {["Doorlopend", "Eenmalig"].filter((group) => type === "all" || type === group).map((group) =>
      <Table key={group} title={group === "Doorlopend" ? "Doorlopende awards" : "Eenmalige awards"}
        headers={["Award", "Brons", "Zilver", "Goud"]}
        rows={catalog.awards.filter((award) => award.type === group && matches(award.naam, search))
          .sort((a, b) => a.naam.localeCompare(b.naam, "nl"))
          .map((award) => [award.naam, <FieldValue value={award.brons} group="" />,
            <FieldValue value={award.zilver} group="" />, <FieldValue value={award.goud} group="" />])} />)}
    <Source />
  </div>;
}
export function POIPage({ result }: ResourceProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "used">("name");
  const [desc, setDesc] = useState(false);
  const [usedOnly, setUsedOnly] = useState(false);
  const parsed = read(result, parseMissions);
  if (!parsed.ok) return <Failure error={parsed.error} />;
  const rows = poiUsage(parsed.value).filter((poi) => matches(poi.name, search) && (!usedOnly || poi.used > 0))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name, "nl") : a.used - b.used || a.name.localeCompare(b.name, "nl")) * (desc ? -1 : 1));
  function sortBy(column: "name" | "used") {
    setDesc(sort === column ? !desc : column === "used");
    setSort(column);
  }
  return <div className="report-page information-page">
    <div className="section-heading"><div><h2>POI</h2><p>Alle POI-typen en het aantal gekoppelde inzetvarianten, niet je eigen geplaatste POI's.</p></div>
      <Search value={search} onChange={setSearch} label="Zoek POI..." />
    </div>
    <label><input type="checkbox" checked={usedOnly} onChange={(event) => setUsedOnly(event.target.checked)} /> Alleen gebruikte POI-typen</label>
    <Table title={`POI-typen (${count(rows.length)})`} headers={[
      <button type="button" onClick={() => sortBy("name")}>POI {sort === "name" ? desc ? "↓" : "↑" : ""}</button>,
      <button type="button" onClick={() => sortBy("used")}>Aantal inzetten {sort === "used" ? desc ? "↓" : "↑" : ""}</button>,
    ]} rows={rows.map((poi) => [poi.name, count(poi.used)])} />
    <Source missions />
  </div>;
}
export const PoiPage = POIPage;

export function InformationPage({ result }: ResourceProps) {
  const parsed = read(result, parseMissions);
  if (!parsed.ok) return <Failure error={parsed.error} />;
  return <div className="report-page information-page">
    <h2>Spelinformatie</h2>
    <Table title="Catalogusoverzicht" headers={["Onderdeel", "Aantal", "Inhoud"]} rows={[
      ["Inzetten", count(parsed.value.length), "Benodigdheden, kansen en generatievoorwaarden"],
      ["Teaminzetten", count(parsed.value.filter((mission) => mission.additional.only_alliance_mission === true).length), "Alleen inzetbaar als team"],
      ["Geplande inzetten", count(parsed.value.filter((mission) => mission.additional.guard_mission === true).length), "Vooraf geplande inzetten"],
      ["Events", count(catalog.events.length), "Feestdagen en seizoensactiviteiten"],
      ["Awards", count(catalog.awards.length), "Doelen voor brons, zilver en goud"],
      ["POI-typen", count(catalog.poi.length), "Locaties die inzetten kunnen genereren"],
    ]} />
    <Source missions />
  </div>;
}
