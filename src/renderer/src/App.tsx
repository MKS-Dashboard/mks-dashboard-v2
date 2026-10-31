import { useCallback, useEffect, useState } from "react";
import { BuildingsPage, ProgressPage, VehiclesPage } from "./DashboardPages";
import { AccountPage, AlliancePage, BuildingDetailsPage, CreditsPage, SchoolingsPage, SuggestionsPage } from "./AccountPages";
import { AllianceEventsPage, AllianceMissionsPage, AwardsPage, EventsPage, InformationPage, MissionsPage, PlannedMissionsPage, POIPage } from "./InformationPages";
import {
  dashboardResources,
  type AppInfo,
  type DashboardData,
  type DashboardResourceKey,
  type UpdateStatus,
} from "../../shared/contracts";

const extraPages = [
  { key: "progressdata", label: "Progressdata" },
  { key: "specializations", label: "Gebouwspecialisaties" },
  { key: "hospitals", label: "Eigen ziekenhuizen" },
  { key: "cells", label: "Eigen cellen" },
  { key: "teamHospitals", label: "Teamziekenhuizen" },
  { key: "teamCells", label: "Teamcellen" },
  { key: "creditComparison", label: "Credits per spelversie" },
  { key: "suggestions", label: "Suggesties" },
  { key: "plannedMissions", label: "Geplande missies" },
  { key: "seasonalEvents", label: "Evenementen" },
  { key: "largeAllianceMissions", label: "Grote teammissies" },
  { key: "awards", label: "Onderscheidingen" },
  { key: "information", label: "Informatie" },
] as const;
type PageKey = "overview" | typeof extraPages[number]["key"] | DashboardResourceKey;

function recordsFrom(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const nestedArray = Object.values(data).find(Array.isArray);
    if (nestedArray) return nestedArray;
  }
  return data === null || data === undefined ? [] : [data];
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
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: "idle" });

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
        const auth = await window.mksDashboard.getAuthStatus();
        if (auth.hasSessionId) setError("De gamegegevens zijn niet opgehaald. Controleer je SessionID en internetverbinding.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "De gegevens konden niet worden opgehaald.");
      setShowSessionForm(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const status = await window.mksDashboard.getAuthStatus();
        if (!active) return;
        setHasSessionId(status.hasSessionId);
        if (status.hasSessionId) {
          await refresh();
        } else {
          setShowSessionForm(true);
        }
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "De opgeslagen SessionID kon niet worden geladen.");
        setShowSessionForm(true);
      } finally {
        if (active) setCheckingSession(false);
      }
    })();
    return () => { active = false; };
  }, [refresh]);

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
  const selectedLabel = extraPages.find((item) => item.key === page)?.label ?? activeResource?.label ?? "Overzicht";
  const publicPage = ["creditComparison", "suggestions", "awards", "information", "missions",
    "plannedMissions", "seasonalEvents", "largeAllianceMissions", "allianceEvents", "pointsOfInterest"].includes(page);
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
              {data?.[resource.key]?.ok && !["credits", "allianceInfo", "pointsOfInterest"].includes(resource.key) && (
                <span className="nav-count">{resourceCount(data, resource.key)}</span>
              )}
            </button>
          ))}
          {extraPages.map((item) => <button key={item.key} className={`nav-item ${page === item.key ? "active" : ""}`}
            onClick={() => setPage(item.key)}><span className="nav-icon">{item.label.slice(0, 1)}</span>{item.label}</button>)}
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

          {checkingSession && !publicPage && (
            <div className="notice" role="status">Opgeslagen SessionID controleren en gegevens ophalen...</div>
          )}
          {(!data || showSessionForm) && !checkingSession && !publicPage && (
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
                        <small>{!result.ok ? "Niet beschikbaar" : resource.key === "pointsOfInterest" ? "Missies per POI-type" :
                          resource.key === "credits" ? "Accountoverzicht" : resource.key === "allianceInfo" ? "Teamkas en leden" :
                            `${recordsFrom(result.data).length} items`}</small>
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

          {page === "vehicles" && data && <VehiclesPage result={data.vehicles} />}
          {page === "buildings" && data && <BuildingsPage result={data.buildings} />}
          {page === "allianceBuildings" && data && <BuildingsPage result={data.allianceBuildings} alliance />}
          {page === "progressdata" && data && <ProgressPage data={data} />}
          {page === "credits" && data && <AccountPage result={data.credits} />}
          {page === "allianceInfo" && data && <AlliancePage result={data.allianceInfo} />}
          {page === "schoolings" && data && <SchoolingsPage result={data.schoolings} />}
          {page === "allianceSchoolings" && data && <SchoolingsPage result={data.allianceSchoolings} alliance />}
          {page === "specializations" && data && <BuildingDetailsPage result={data.buildings} kind="specializations" />}
          {(page === "hospitals" || page === "cells") && data && <BuildingDetailsPage result={data.buildings} kind={page} />}
          {(page === "teamHospitals" || page === "teamCells") && data &&
            <BuildingDetailsPage result={data.allianceBuildings} kind={page === "teamHospitals" ? "hospitals" : "cells"} alliance />}
          {page === "creditComparison" && <CreditsPage />}
          {page === "suggestions" && <SuggestionsPage />}
          {page === "awards" && <AwardsPage />}
          {page === "missions" && data && <MissionsPage result={data.missions} />}
          {page === "seasonalEvents" && data && <EventsPage result={data.missions} />}
          {page === "plannedMissions" && data && <PlannedMissionsPage result={data.missions} />}
          {page === "largeAllianceMissions" && data && <AllianceMissionsPage result={data.missions} />}
          {page === "allianceEvents" && data && <AllianceEventsPage result={data.allianceEvents} missionsResult={data.missions} />}
          {page === "pointsOfInterest" && data && <POIPage result={data.missions} />}
          {page === "information" && data && <InformationPage result={data.missions} />}
          {publicPage && page !== "awards" && page !== "creditComparison" && page !== "suggestions" && !data &&
            <div className="empty-state">Klik op Gegevens ophalen om de openbare missiegegevens te laden. Een SessionID is hiervoor niet nodig.</div>}
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
