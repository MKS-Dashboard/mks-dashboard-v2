import { useState, type ReactNode } from "react";
import type { DashboardData, DashboardResourceResult } from "../../shared/contracts";
import {
  buildingOverview, capacityOverview, parseBuildings, parseVehicles, vehicleOverview,
  type Capacity,
} from "./dashboard-model";

const count = (value: number) => value.toLocaleString("nl-NL");

export function read<T>(result: DashboardResourceResult, parse: (data: unknown) => T):
  { ok: true; value: T } | { ok: false; error: string } {
  if (!result.ok) return result;
  try {
    return { ok: true, value: parse(result.data) };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "De gegevens konden niet worden verwerkt." };
  }
}

export function Failure({ message }: { message: string }) {
  return <div className="notice notice-error" role="alert">{message}</div>;
}

export function Table({ title, headers, rows, tone = "", empty = "Geen gegevens in bezit." }: {
  title: string; headers: string[]; rows: ReactNode[][]; tone?: string; empty?: string;
}) {
  return (
    <section className={`data-panel report-table ${tone}`}>
      <div className="data-toolbar"><h2>{title}</h2></div>
      {rows.length === 0 ? <div className="empty-state">{empty}</div> : (
        <div className="table-scroll"><table>
          <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) =>
            <td key={column}>{typeof cell === "number" ? count(cell) : cell}</td>)}</tr>)}</tbody>
        </table></div>
      )}
    </section>
  );
}

export function VehiclesPage({ result }: { result: DashboardResourceResult }) {
  const [search, setSearch] = useState("");
  const parsed = read(result, parseVehicles);
  if (!parsed.ok) return <Failure message={parsed.error} />;
  const overview = vehicleOverview(parsed.value);
  const matches = (name: string, description = "") =>
    `${name} ${description}`.toLocaleLowerCase("nl").includes(search.trim().toLocaleLowerCase("nl"));
  const sections = overview.categories.map((category) => ({
    ...category,
    types: category.types.filter((type) => matches(type.name, type.description)),
    groups: category.groups.filter((group) => matches(group.name, group.description)),
    values: category.values.filter((value) => matches(value.name)),
  })).filter((category) => category.types.length + category.groups.length + category.values.length > 0);
  const unknown = overview.unknown.filter((type) => matches(type.name));
  return (
    <div className="report-page">
      <div className="section-heading">
        <div><h2>Je hebt {count(overview.total)} voertuigen in totaal.</h2><p>Aantallen per hulpdienst, voertuigtype en groep.</p></div>
        <input className="search-input" type="search" aria-label="Zoeken in voertuigen" placeholder="Zoek type of groep..."
          value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      {sections.map((category) => <div className="report-category" key={category.category}>
        <Table title={`${category.name} (${count(category.total)})`}
          tone={category.tone} headers={["Afkorting", "Omschrijving", "Aantal"]}
          rows={category.types.map((type) => [type.name, type.description, count(type.count)])} />
        {category.groups.length > 0 && <Table title={`${category.name} - voertuiggroepen`} tone={category.tone}
          headers={["Groep", "Voertuigen", "Aantal"]}
          rows={category.groups.map((group) => [group.name, group.description, count(group.count)])} />}
        {category.values.length > 0 && <Table title={`${category.name} - extra waarden`} tone={category.tone}
          headers={["Waarde", "Aantal"]} rows={category.values.map((value) => [value.name, count(value.count)])} />}
      </div>)}
      {unknown.length > 0 && <Table title="Overige voertuigtypen" headers={["Type", "Aantal"]}
        rows={unknown.map((type) => [type.name, count(type.count)])} />}
      {sections.length === 0 && unknown.length === 0 && <div className="empty-state">Geen voertuigen gevonden.</div>}
    </div>
  );
}

export function BuildingsPage({ result, alliance = false }: { result: DashboardResourceResult; alliance?: boolean }) {
  const [search, setSearch] = useState("");
  const parsed = read(result, parseBuildings);
  if (!parsed.ok) return <Failure message={parsed.error} />;
  const overview = buildingOverview(parsed.value);
  const matches = (name: string) => name.toLocaleLowerCase("nl").includes(search.trim().toLocaleLowerCase("nl"));
  return <div className="report-page">
    <div className="section-heading">
      <div><h2>{alliance ? "Teamgebouwen" : "Gebouwen"}</h2><p>Fysieke locaties en technische aantallen volgens de webapp.</p></div>
      <input className="search-input" type="search" aria-label="Zoeken in gebouwen" placeholder="Zoek type of uitbreiding..."
        value={search} onChange={(event) => setSearch(event.target.value)} />
    </div>
    <Table title={`Gebouwen (Technisch: ${count(overview.technical)} / Fysiek: ${count(overview.physical)})`}
      headers={["Type", "Aantal fysiek", "Aantal technisch"]}
      rows={overview.types.filter((type) => matches(type.name)).map((type) => [type.name, count(type.physical), count(type.technical)])} />
    <Table title={`Uitbreidingen (${count(overview.extensions.reduce((sum, row) => sum + row.count, 0))})`}
      headers={["Type", "Aantal", "Actief / Inactief", "Status onbekend"]}
      rows={overview.extensions.filter((row) => matches(row.name)).map((row) =>
        [row.name, count(row.count), `${count(row.active)} / ${count(row.inactive)}`, count(row.pending)])} />
    <Table title="Specialisaties" headers={["Type", "Aantal"]}
      rows={overview.specializations.filter((row) => matches(row.name)).map((row) => [row.name, count(row.count)])} />
  </div>;
}

function CapacityBar({ label, capacity }: { label: string; capacity: Capacity }) {
  const percentage = capacity.total === 0 ? 0 : capacity.used / capacity.total * 100;
  const free = Math.max(0, capacity.total - capacity.used);
  return <div className="capacity-row">
    <div className="capacity-label"><strong>{label}</strong>
      <span>{capacity.total === 0 ? "Geen capaciteit" : `${percentage.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% in gebruik`}</span></div>
    <div className={`capacity-track ${capacity.total === 0 ? "capacity-empty" : ""}`} role="meter" aria-label={`${label}: ${count(capacity.used)} in gebruik van ${count(capacity.total)}`}
      aria-valuemin={0} aria-valuemax={Math.max(1, capacity.total)} aria-valuenow={Math.min(capacity.used, Math.max(1, capacity.total))}>
      <div className="capacity-used" style={{ width: `${Math.min(100, percentage)}%` }} />
    </div>
    <div className="capacity-legend"><span>In gebruik: {count(capacity.used)}</span><span>Vrij: {count(free)} / Totaal: {count(capacity.total)}</span></div>
    {capacity.used > capacity.total && <Failure message="De API meldt meer bezetting dan berekende capaciteit." />}
  </div>;
}

export function ProgressPage({ data }: { data: DashboardData }) {
  const own = read(data.buildings, parseBuildings);
  const alliance = read(data.allianceBuildings, parseBuildings);
  const ownCapacity = own.ok ? capacityOverview(own.value) : null;
  const teamCapacity = alliance.ok ? capacityOverview(alliance.value, true) : null;
  return <div className="report-page">
    <div className="section-heading"><div><h2>Progressdata</h2><p>Bezetting van ziekenhuisbedden, cellen en klaslokalen.</p></div></div>
    {!own.ok && <Failure message={`Eigen gebouwen: ${own.error}`} />}
    {!alliance.ok && <Failure message={`Teamgebouwen: ${alliance.error}`} />}
    <section className="data-panel capacity-panel"><h2>Ziekenhuisbedden</h2>
      {ownCapacity && <CapacityBar label="Eigen" capacity={ownCapacity.beds} />}
      {teamCapacity && <CapacityBar label="Team" capacity={teamCapacity.beds} />}
    </section>
    <section className="data-panel capacity-panel"><h2>Cellen</h2>
      {ownCapacity && <CapacityBar label="Eigen" capacity={ownCapacity.cells} />}
      {teamCapacity && <CapacityBar label="Team" capacity={teamCapacity.cells} />}
    </section>
    <div className="section-heading"><h2>Scholen</h2></div>
    {(ownCapacity?.schools ?? teamCapacity?.schools ?? []).map((school, index) =>
      <section className="data-panel capacity-panel" key={school.name}><h2>{school.name}</h2>
        {ownCapacity && <CapacityBar label="Eigen" capacity={ownCapacity.schools[index]} />}
        {teamCapacity && <CapacityBar label="Team" capacity={teamCapacity.schools[index]} />}
      </section>)}
  </div>;
}
