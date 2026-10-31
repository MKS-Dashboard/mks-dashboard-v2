import { useCallback, useEffect, useMemo, useState } from "react";
import {
  dashboardResources,
  type AppInfo,
  type DashboardData,
  type DashboardResourceKey,
  type UpdateStatus,
} from "../../shared/contracts";

type PageKey = "overview" | DashboardResourceKey;

function recordsFrom(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const nestedArray = Object.values(data).find(Array.isArray);
    if (nestedArray) return nestedArray;
  }
  return data === null || data === undefined ? [] : [data];
}

function recordTitle(record: unknown, index: number): string {
  if (record && typeof record === "object" && !Array.isArray(record)) {
    const fields = record as Record<string, unknown>;
    const title = fields.name ?? fields.caption ?? fields.title ?? fields.id ?? fields.ID;
    if (typeof title === "string" || typeof title === "number") return String(title);
  }
  return `Gegeven ${index + 1}`;
}

function App() {
  const [page, setPage] = useState<PageKey>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [hasSessionId, setHasSessionId] = useState(false);
  const [sessionDraft, setSessionDraft] = useState("");
  const [rememberSession, setRememberSession] = useState(true);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: "idle" });

  const updateSessionStatus = useCallback(async () => {
    setCheckingSession(true);
    try {
      const status = await window.mksDashboard.getAuthStatus();
      setHasSessionId(status.hasSessionId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "De sessiestatus kon niet worden gecontroleerd.");
    } finally {
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    void updateSessionStatus();
  }, [updateSessionStatus]);

  useEffect(() => {
    let active = true;
    const unsubscribe = window.mksDashboard.onUpdateStatus(setUpdateStatus);

    void Promise.all([
      window.mksDashboard.getAppInfo(),
      window.mksDashboard.getUpdateStatus(),
    ]).then(([info, status]) => {
      if (!active) return;
      setAppInfo(info);
      setUpdateStatus(status);
    }).catch((cause: unknown) => {
      if (!active) return;
      setUpdateStatus({
        state: "error",
        message: cause instanceof Error ? cause.message : "Controleren op updates is mislukt.",
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await window.mksDashboard.loadDashboard();
      setData(result);
      setLastUpdated(new Date());
      const sessionAccepted = dashboardResources.some(
        ({ key, sessionRequired = true }) => sessionRequired && result[key].ok,
      );
      setShowSessionForm(!sessionAccepted);
      if (!sessionAccepted) {
        setError("De gamegegevens zijn niet opgehaald. Controleer je SessionID en internetverbinding.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "De gegevens konden niet worden opgehaald.");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAndRefresh = useCallback(async () => {
    setError("");
    try {
      if (sessionDraft.trim()) {
        await window.mksDashboard.setSessionId(sessionDraft, rememberSession);
        setSessionDraft("");
        setHasSessionId(true);
      } else if (!hasSessionId) {
        setError("Vul je Meldkamerspel-SessionID in voordat je gegevens ophaalt.");
        return;
      }
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "De SessionID kon niet worden ingesteld.");
    }
  }, [hasSessionId, rememberSession, refresh, sessionDraft]);

  const deleteSession = useCallback(async () => {
    try {
      await window.mksDashboard.logout();
      setHasSessionId(false);
      setSessionDraft("");
      setData(null);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "De SessionID kon niet worden verwijderd.");
    }
  }, []);

  const activeResource = page === "overview"
    ? null
    : dashboardResources.find((resource) => resource.key === page);
  const activeResult = activeResource && data ? data[activeResource.key] : null;

  const visibleRecords = useMemo(() => {
    if (!activeResource || !data?.[activeResource.key]?.ok) return [];
    const result = data[activeResource.key];
    if (!result.ok) return [];
    const searchTerm = search.trim().toLocaleLowerCase("nl");
    return recordsFrom(result.data)
      .filter((record) => !searchTerm || JSON.stringify(record).toLocaleLowerCase("nl").includes(searchTerm))
      .slice(0, 200);
  }, [activeResource, data, search]);

  const selectedLabel = activeResource?.label ?? "Overzicht";
  const updateMessage = {
    idle: "",
    checking: "Controleren op updates...",
    available: `Versie ${updateStatus.version ?? ""} gevonden. Download wordt gestart...`,
    downloading: `Update downloaden${updateStatus.percent === undefined ? "..." : `: ${updateStatus.percent}%`}`,
    downloaded: `Versie ${updateStatus.version ?? ""} is gedownload en klaar om te installeren.`,
    "up-to-date": "Je gebruikt de nieuwste versie van dit kanaal.",
    error: updateStatus.message ? `Updatecontrole mislukt: ${updateStatus.message}` : "Updatecontrole mislukt.",
  }[updateStatus.state];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">MKS</div>
          <div>
            <strong>MKS Dashboard</strong>
            <span>Desktop</span>
          </div>
        </div>

        <div className="nav-heading">DASHBOARD</div>
        <nav aria-label="Hoofdnavigatie">
          <button className={`nav-item ${page === "overview" ? "active" : ""}`} onClick={() => setPage("overview")}>
            <span className="nav-icon">O</span> Overzicht
          </button>
          {dashboardResources.map((resource) => (
            <button
              className={`nav-item ${page === resource.key ? "active" : ""}`}
              key={resource.key}
              onClick={() => setPage(resource.key)}
            >
              <span className="nav-icon">{resource.label.slice(0, 1)}</span>
              {resource.label}
              {data?.[resource.key]?.ok && (
                <span className="nav-count">{resourceCount(data, resource.key)}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className={`status-dot ${hasSessionId ? "connected" : ""}`} />
          <span>{checkingSession ? "SessionID controleren" : hasSessionId ? "SessionID ingesteld" : "Geen SessionID ingesteld"}</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <div className="eyebrow">MELDKAMERSPEL</div>
            <h1>{selectedLabel}</h1>
          </div>
          <div className="topbar-actions">
            {updateStatus.state === "downloaded" ? (
              <button className="button button-primary" onClick={() => void window.mksDashboard.installUpdate()}>
                Herstarten en bijwerken
              </button>
            ) : (
              <button
                className="button button-secondary"
                disabled={
                  updateStatus.state === "checking" ||
                  updateStatus.state === "available" ||
                  updateStatus.state === "downloading"
                }
                onClick={() => void window.mksDashboard.checkForUpdates()}
              >
                {updateStatus.state === "downloading" ? "Update downloaden..." : "Updates controleren"}
              </button>
            )}
            <button className="button button-primary" disabled={loading} onClick={() => void refresh()}>
              {loading ? <><span className="spinner" /> Ophalen...</> : "Gegevens ophalen"}
            </button>
            {hasSessionId && data && (
              <button className="button button-secondary" onClick={() => setShowSessionForm(true)}>
                SessionID aanpassen
              </button>
            )}
            {hasSessionId && (
              <button
                className="button button-quiet"
                onClick={() => void deleteSession()}
              >
                SessionID wissen
              </button>
            )}
          </div>
        </header>

        <section className="content">
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          {updateStatus.state !== "idle" && (
            <div
              className={`notice notice-update ${updateStatus.state === "error" ? "notice-error" : ""}`}
              role="status"
            >
              {updateMessage}
            </div>
          )}

          {(!data || showSessionForm) && (
            <section className="welcome-panel">
              <div className="welcome-icon">M</div>
              <div className="welcome-copy">
                <span className="eyebrow">{data ? "ACCOUNTINSTELLINGEN" : "JOUW LOKALE DASHBOARD"}</span>
                <h2>{data ? "SessionID aanpassen" : "Welkom bij MKS Dashboard Desktop"}</h2>
                <p>
                  Voer de SessionID van Meldkamerspel in. De app stuurt deze rechtstreeks
                  naar de game-API en gebruikt geen externe MKS-proxy.
                </p>
                <label className="field-label" htmlFor="session-id">Meldkamerspel-SessionID</label>
                <input
                  id="session-id"
                  className="session-input"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Plak hier je SessionID"
                  value={sessionDraft}
                  onChange={(event) => setSessionDraft(event.target.value)}
                />
                <label className="remember-option">
                  <input
                    type="checkbox"
                    checked={rememberSession}
                    onChange={(event) => setRememberSession(event.target.checked)}
                  />
                  <span>Bewaar de SessionID versleuteld op deze pc</span>
                </label>
                <div className="welcome-actions">
                  <button className="button button-primary" disabled={loading} onClick={() => void saveAndRefresh()}>
                    {loading ? "Gegevens ophalen..." : sessionDraft.trim() ? "SessionID opslaan en ophalen" : "Gegevens ophalen"}
                  </button>
                </div>
                {hasSessionId && (
                  <p className="saved-session-note">
                    Er staat al een SessionID ingesteld. Vul alleen iets in als je deze wilt vervangen.
                  </p>
                )}
                <p className="privacy-note">
                  Je SessionID wordt uitsluitend naar meldkamerspel.com gestuurd. Live gegevens vereisen internet.
                </p>
              </div>
            </section>
          )}

          {page === "overview" && data && (
            <>
              <section className="summary-row">
                <div className="summary-card">
                  <span className="summary-label">Voertuigen</span>
                  <strong>{resourceCount(data, "vehicles")}</strong>
                  <span className="summary-hint">in je account</span>
                </div>
                <div className="summary-card">
                  <span className="summary-label">Gebouwen</span>
                  <strong>{resourceCount(data, "buildings")}</strong>
                  <span className="summary-hint">in je account</span>
                </div>
                <div className="summary-card">
                  <span className="summary-label">Teamgebouwen</span>
                  <strong>{resourceCount(data, "allianceBuildings")}</strong>
                  <span className="summary-hint">gedeelde locaties</span>
                </div>
                <div className="summary-card">
                  <span className="summary-label">Gegevens bijgewerkt</span>
                  <strong className="summary-time">{lastUpdated ? lastUpdated.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : "—"}</strong>
                  <span className="summary-hint">{lastUpdated ? lastUpdated.toLocaleDateString("nl-NL") : "nog niet opgehaald"}</span>
                </div>
              </section>
              <div className="section-heading">
                <div>
                  <h2>Gegevensbronnen</h2>
                  <p>Kies een onderdeel om de opgehaalde gegevens te bekijken.</p>
                </div>
              </div>
              <section className="resource-grid">
                {dashboardResources.map((resource) => {
                  const result = data[resource.key];
                  return (
                    <button className="resource-card" key={resource.key} onClick={() => setPage(resource.key)}>
                      <span className="resource-icon">{resource.label.slice(0, 1)}</span>
                      <span className="resource-text">
                        <strong>{resource.label}</strong>
                        <small>{result.ok ? `${recordsFrom(result.data).length} items` : "Niet beschikbaar"}</small>
                      </span>
                      <span className="resource-arrow">›</span>
                    </button>
                  );
                })}
              </section>
              <p className="last-updated">
                {lastUpdated ? `Laatst bijgewerkt om ${lastUpdated.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}` : "Nog geen gegevens opgehaald"}
              </p>
            </>
          )}

          {activeResource && data && activeResult && (
            <section className="data-panel">
              <div className="data-toolbar">
                <div>
                  <h2>{activeResource.label}</h2>
                  <p>
                    {activeResult.ok
                      ? `${recordsFrom(activeResult.data).length} items ontvangen van Meldkamerspel`
                      : "Deze gegevensbron kon niet worden geladen."}
                  </p>
                </div>
                {activeResult.ok && (
                  <input
                    className="search-input"
                    type="search"
                    placeholder="Zoeken in gegevens..."
                    aria-label={`Zoeken in ${activeResource.label}`}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                )}
              </div>
              {!activeResult.ok ? (
                <div className="empty-state">
                  <strong>Gegevens niet beschikbaar</strong>
                  <p>{activeResult.error}</p>
                </div>
              ) : visibleRecords.length === 0 ? (
                <div className="empty-state">
                  <strong>Geen gegevens gevonden</strong>
                  <p>Pas je zoekterm aan of haal de gegevens opnieuw op.</p>
                </div>
              ) : (
                <div className="record-list">
                  {visibleRecords.map((record, index) => (
                    <details className="record-item" key={`${activeResource.key}-${index}`}>
                      <summary>
                        <span className="record-number">{index + 1}</span>
                        <strong>{recordTitle(record, index)}</strong>
                        <span className="record-toggle">Details bekijken</span>
                      </summary>
                      <pre>{JSON.stringify(record, null, 2)}</pre>
                    </details>
                  ))}
                  {activeResult.ok && recordsFrom(activeResult.data).length > 200 && (
                    <p className="limit-note">De eerste 200 items worden getoond. Gebruik de zoekfunctie om gegevens te filteren.</p>
                  )}
                </div>
              )}
            </section>
          )}
        </section>
        <footer className="app-footer">
          <span>
            Versie {appInfo?.version ?? "…"} · {appInfo?.channel === "dev" ? "Dev-kanaal" : "Stable-kanaal"}
          </span>
        </footer>
      </main>
    </div>
  );
}

function resourceCount(data: DashboardData, key: DashboardResourceKey): number | string {
  const result = data[key];
  return result.ok ? recordsFrom(result.data).length : "—";
}

export default App;
