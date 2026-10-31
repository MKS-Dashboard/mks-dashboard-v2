import { useState } from "react";
import { dashboardResources, type DashboardData, type DashboardResourceKey } from "../../shared/contracts";

export function RawResponsesPage({ data }: { data: DashboardData | null }) {
  const [resourceKey, setResourceKey] = useState<DashboardResourceKey>("vehicles");
  const resource = dashboardResources.find((item) => item.key === resourceKey)!;
  const result = data?.[resourceKey];

  return (
    <section className="data-panel">
      <div className="data-toolbar">
        <div>
          <h2>Raw API-responses</h2>
          <p>De laatst opgehaalde dashboardgegevens, zonder bewerking.</p>
        </div>
        <select className="search-input" aria-label="API-gegevensbron" value={resourceKey}
          onChange={(event) => {
            const selected = dashboardResources.find((item) => item.key === event.target.value);
            if (selected) setResourceKey(selected.key);
          }}>
          {dashboardResources.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
      </div>
      <div className="raw-response-content">
        <div className="field-label">Gebruikte URL (GET)</div>
        <code className="raw-response-url">{result?.requestUrl ?? `Nog geen requestgegevens beschikbaar (${resource.endpoint}).`}</code>
        <p className="raw-response-note">SessionID wordt afgeschermd. Responses kunnen account- en teamgegevens bevatten; deel ze niet zomaar.</p>
        {!result ? <div className="empty-state">Klik op Gegevens ophalen om de API-responses te bekijken.</div>
          : !result.ok ? <div className="notice" role="alert">{result.error}</div>
            : <pre className="raw-response-json" tabIndex={0} aria-label="Raw JSON-response">{JSON.stringify(result.data, null, 2)}</pre>}
      </div>
    </section>
  );
}
