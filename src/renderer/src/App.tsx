import { useCallback, useEffect, useRef, useState } from "react";
import { BuildingsPage, ProgressPage, read, VehiclesPage } from "./DashboardPages";
import { schoolingRecords } from "./schoolings";
import { defaultRefreshMinutes, parseRefreshMinutes, refreshDue } from "./refresh-interval";
import { accountUsername, AccountPage, AlliancePage, BuildingDetailsPage, CreditsPage, SchoolingsPage, SuggestionsPage } from "./AccountPages";
import { AllianceEventsPage, AllianceMissionsPage, AwardsPage, EventsPage, InformationPage, MissionsPage, PlannedMissionsPage, POIPage } from "./InformationPages";
import { infoblocksAllowed, isInfoblockPage } from "./infoblocks";
import { RawResponsesPage } from "./RawResponsesPage";
import { ErrorReportPanel } from "./ErrorReportPanel";
import { clearReportIssues, recordAppIssue } from "./error-report";
import { extraPages, navigationGroups, navigationPages, pageAllowed, type PageKey } from "./navigation";
import {
  dashboardResources,
  type AppInfo,
  type DashboardData,
  type DashboardResourceKey,
  type UpdateStatus,
} from "../../shared/contracts";

function recordsFrom(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const nestedArray = Object.values(data).find(Array.isArray);
    if (nestedArray) return nestedArray;
  }
  return data === null || data === undefined ? [] : [data];
}

function App() {
  const userMenu = useRef<HTMLDetailsElement>(null);
  const refreshInFlight = useRef(false);
  const [page, setPage] = useState<PageKey>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [hasSessionId, setHasSessionId] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [sessionDraft, setSessionDraft] = useState("");
  const [rememberSession, setRememberSession] = useState(true);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: "idle" });
  const [infoblocks, setInfoblocks] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [refreshMinutes, setRefreshMinutes] = useState(defaultRefreshMinutes);
  const [refreshDraft, setRefreshDraft] = useState(String(defaultRefreshMinutes));
  const [refreshSettingError, setRefreshSettingError] = useState("");
  const [refreshSettingsLoaded, setRefreshSettingsLoaded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (error) recordAppIssue("App", error);
    if (refreshSettingError) recordAppIssue("Instellingen", refreshSettingError);
  }, [error, refreshSettingError]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => recordAppIssue("Runtime", event.message);
    const onRejection = (event: PromiseRejectionEvent) => recordAppIssue("Onverwerkte promise", event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mks-refresh-minutes");
      const enabled = localStorage.getItem("mks-auto-refresh");
      if (enabled !== null && enabled !== "true" && enabled !== "false") {
        throw new Error("De opgeslagen instelling voor automatisch vernieuwen is ongeldig.");
      }
      const minutes = saved === null ? defaultRefreshMinutes : parseRefreshMinutes(saved);
      setRefreshMinutes(minutes);
      setRefreshDraft(String(minutes));
      setAutoRefresh(enabled !== "false");
      setRefreshSettingsLoaded(true);
    } catch (cause) {
      setRefreshSettingError(cause instanceof Error ? cause.message : "Het vernieuwingsinterval kon niet worden geladen.");
    }
  }, []);

  function changeAutoRefresh(enabled: boolean): void {
    try {
      localStorage.setItem("mks-auto-refresh", String(enabled));
      setAutoRefresh(enabled);
    } catch (cause) {
      setRefreshSettingError(cause instanceof Error ? cause.message : "Automatisch vernieuwen kon niet worden opgeslagen.");
    }
  }

  function saveRefreshInterval(): void {
    try {
      const minutes = parseRefreshMinutes(refreshDraft);
      localStorage.setItem("mks-refresh-minutes", String(minutes));
      setRefreshMinutes(minutes);
      setRefreshDraft(String(minutes));
      setRefreshSettingsLoaded(true);
      setRefreshSettingError("");
    } catch (cause) {
      setRefreshSettingError(cause instanceof Error ? cause.message : "Het vernieuwingsinterval kon niet worden opgeslagen.");
    }
  }

  useEffect(() => {
    if (updateStatus.state === "error" && updating) {
      setUpdating(false);
      setError(updateStatus.message ?? "Update uitvoeren is mislukt.");
    }
  }, [updateStatus, updating]);

  useEffect(() => {
    function closeUserMenu(event: PointerEvent) {
      if (event.target instanceof Node && !userMenu.current?.contains(event.target)) {
        if (userMenu.current) userMenu.current.open = false;
      }
    }
    document.addEventListener("pointerdown", closeUserMenu);
    return () => document.removeEventListener("pointerdown", closeUserMenu);
  }, []);

  useEffect(() => {
    try {
      for (const [key, label, setter] of [
        ["mks-infoblocks", "Infoblocks", setInfoblocks],
        ["mks-dev-mode", "Dev mode", setDevMode],
      ] as const) {
        const saved = localStorage.getItem(key);
        if (saved !== null && saved !== "true" && saved !== "false") {
          throw new Error(`De opgeslagen instelling voor ${label} is ongeldig.`);
        }
        setter(saved === "true");
      }
      setSettingsLoaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Instellingen konden niet worden geladen.");
    }
  }, []);

  const showInfoblocks = infoblocksAllowed(appInfo?.channel, infoblocks);
  const showDevMode = appInfo?.channel === "dev" && devMode;
  const allowed = (key: PageKey) => pageAllowed(key, signedIn, appInfo?.channel, infoblocks, devMode);
  const visibleResources = dashboardResources.filter((item) => item.key !== "credits" && allowed(item.key));
  const visiblePages = navigationPages.filter((item) => item.key !== "credits" && allowed(item.key));
  const currentPageAllowed = allowed(page);

  useEffect(() => {
    if (!currentPageAllowed) setPage("overview");
  }, [currentPageAllowed]);

  function changeSetting(setting: "infoblocks" | "dev-mode", enabled: boolean): void {
    try {
      localStorage.setItem(`mks-${setting}`, String(enabled));
      if (setting === "infoblocks") setInfoblocks(enabled);
      else setDevMode(enabled);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "De instelling kon niet worden opgeslagen.");
    }
  }

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
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await window.mksDashboard.loadDashboard();
      setData(result);
      setLastUpdated(new Date());
      const sessionAccepted = dashboardResources.some(
        ({ key, sessionRequired = true }) => sessionRequired && result[key].ok,
      );
      setSignedIn(sessionAccepted);
      setShowSessionForm(!sessionAccepted);
      if (!sessionAccepted) {
        const auth = await window.mksDashboard.getAuthStatus();
        if (auth.hasSessionId) setError("De gamegegevens zijn niet opgehaald. Controleer je SessionID en internetverbinding.");
      }
    } catch (cause) {
      setSignedIn(false);
      setError(cause instanceof Error ? cause.message : "De gegevens konden niet worden opgehaald.");
      setShowSessionForm(true);
    } finally {
      refreshInFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRefresh || !signedIn || !refreshSettingsLoaded || !lastUpdated || checkingSession || loading || loggingOut || updating) return;
    const timer = setInterval(() => {
      if (refreshDue(lastUpdated.getTime(), Date.now(), refreshMinutes)) void refresh();
    }, 60_000);
    return () => clearInterval(timer);
  }, [autoRefresh, signedIn, refreshSettingsLoaded, lastUpdated, checkingSession, loading, loggingOut, updating, refreshMinutes, refresh]);

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
    setLoggingOut(true);
    try {
      await window.mksDashboard.logout();
      setHasSessionId(false);
      setSignedIn(false);
      setSessionDraft("");
      setData(null);
      clearReportIssues();
      setLastUpdated(null);
      setShowSessionForm(true);
      setPage("overview");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Uitloggen is mislukt.");
    } finally {
      setLoggingOut(false);
    }
  }, []);

  function runUserAction(action: () => Promise<unknown>): void {
    if (userMenu.current) userMenu.current.open = false;
    void action().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "De actie kon niet worden uitgevoerd.");
    });
  }

  async function executeUpdate(): Promise<void> {
    setError("");
    setUpdating(true);
    try {
      await window.mksDashboard.installUpdate();
    } catch (cause) {
      setUpdating(false);
      setError(cause instanceof Error ? cause.message : "Update uitvoeren is mislukt.");
    }
  }

  const activeResource = page === "overview"
    ? null
    : dashboardResources.find((resource) => resource.key === page);
  const selectedLabel = page === "settings" ? "Instellingen" : page === "rawResponses" ? "Raw API-responses" :
    extraPages.find((item) => item.key === page)?.label ?? activeResource?.label ?? "Overzicht";
  const publicPage = isInfoblockPage(page);
  const username = hasSessionId ? accountUsername(data?.credits) : null;
  const userMenuLabel = username ?? (checkingSession ? "Account laden..." : hasSessionId ? "Naam niet beschikbaar" : "Niet aangemeld");
  function navigationButton(item: typeof navigationPages[number]) {
    const resource = dashboardResources.find((entry) => entry.key === item.key);
    return (
      <button className={`nav-item ${page === item.key ? "active" : ""}`} key={item.key} onClick={() => setPage(item.key)}>
        <span className="nav-icon">{item.label.slice(0, 1)}</span>{item.label}
        {resource && data?.[resource.key]?.ok && !["credits", "allianceInfo", "pointsOfInterest"].includes(resource.key) &&
          <span className="nav-count">{resourceCount(data, resource.key)}</span>}
      </button>
    );
  }
  const updateMessage = {
    idle: "",
    checking: "Controleren op updates...",
    available: `Versie ${updateStatus.version ?? ""} is beschikbaar. Klik op Bijwerken om de update uit te voeren.`,
    downloading: `Update downloaden${updateStatus.percent === undefined ? "..." : `: ${updateStatus.percent}%`}`,
    downloaded: `Versie ${updateStatus.version ?? ""} is gedownload en klaar om te installeren.`,
    installing: "De update wordt geinstalleerd. De app opent daarna automatisch.",
    "up-to-date": "Je gebruikt de nieuwste versie van dit kanaal.",
    error: updateStatus.message ? `Updatecontrole mislukt: ${updateStatus.message}` : "Updatecontrole mislukt.",
  }[updateStatus.state];

  return (
    <div className="app-shell">
      {updating && (
        <div className="update-overlay">
          <section className="update-dialog" role="dialog" aria-modal="true" aria-labelledby="update-title" tabIndex={-1}
            ref={(element) => element?.focus()}>
            <div className="brand-mark">MKS</div>
            <h2 id="update-title">MKS Dashboard bijwerken</h2>
            <p>{updateStatus.state === "installing" || updateStatus.state === "downloaded"
              ? "Download voltooid. De installer neemt het over en opent de app automatisch opnieuw."
              : "De nieuwe versie wordt gedownload. Daarna wordt de app opnieuw gestart en bijgewerkt."}</p>
            <progress max={100} value={updateStatus.percent ?? 0} aria-label="Downloadvoortgang" />
            <div role="status">{updateStatus.state === "installing" || updateStatus.state === "downloaded"
              ? "Installatie voorbereiden..." : `Downloaden: ${updateStatus.percent ?? 0}%`}</div>
            <span>Sluit de app niet af tijdens het bijwerken.</span>
          </section>
        </div>
      )}
      <aside className="sidebar" inert={updating}>
        <div className="brand">
          <div className="brand-mark">MKS</div>
          <div>
            <strong>{appInfo?.channel === "dev" ? "MKS Dashboard Beta" : "MKS Dashboard"}</strong>
            <span>Desktop</span>
          </div>
        </div>

        <div className="nav-heading">DASHBOARD</div>
        <nav aria-label="Hoofdnavigatie">
          <button className={`nav-item ${page === "overview" ? "active" : ""}`} onClick={() => setPage("overview")}>
            <span className="nav-icon">O</span> Overzicht
          </button>
          {visiblePages.filter((item) => item.key === "vehicles").map(navigationButton)}
          {navigationGroups.map((group) => {
            const items = group.pages.flatMap((key) => visiblePages.filter((item) => item.key === key));
            if (!items.length) return null;
            return (
              <details className="nav-group" key={group.label} open>
                <summary className={`nav-item ${group.pages.includes(page) ? "active" : ""}`}>
                  <span className="nav-icon">{group.label.slice(0, 1)}</span>{group.label}
                  <span className="nav-group-chevron" aria-hidden="true">▾</span>
                </summary>
                <div className="nav-group-items">{items.map(navigationButton)}</div>
              </details>
            );
          })}
          {visiblePages.filter((item) => item.key !== "vehicles" &&
            !navigationGroups.some((group) => group.pages.includes(item.key))).map(navigationButton)}
          {showDevMode && (
            <button className={`nav-item ${page === "rawResponses" ? "active" : ""}`} onClick={() => setPage("rawResponses")}>
              <span className="nav-icon">D</span> Raw API-responses
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <span className={`status-dot ${hasSessionId ? "connected" : ""}`} />
          <span>{checkingSession ? "SessionID controleren" : hasSessionId ? "SessionID ingesteld" : "Geen SessionID ingesteld"}</span>
        </div>
      </aside>

      <main className="main-area" inert={updating}>
        <header className="topbar">
          <div>
            <div className="eyebrow">MELDKAMERSPEL</div>
            <h1>{selectedLabel}</h1>
          </div>
          <div className="topbar-actions">
            {["available", "downloaded"].includes(updateStatus.state) && (
              <button className="button button-primary" disabled={updating} onClick={() => void executeUpdate()}>
                {updateStatus.state === "downloaded" ? "Herstarten en bijwerken" : "Bijwerken"}
              </button>
            )}
            <details className="user-menu" ref={userMenu}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector("summary")?.focus();
                }
              }}>
              <summary className="button button-secondary">
                <span className="user-avatar" aria-hidden="true">{username ? Array.from(username)[0].toLocaleUpperCase("nl-NL") : "U"}</span>
                <span className="user-menu-name" title={userMenuLabel}>{userMenuLabel}</span>
                <span className="user-menu-chevron" aria-hidden="true">▾</span>
              </summary>
              <div className="user-menu-dropdown">
                <div className="user-menu-heading">{hasSessionId ? "Aangemeld" : "Niet aangemeld"}</div>
                {signedIn && (
                  <button onClick={() => {
                    if (userMenu.current) userMenu.current.open = false;
                    setPage("credits");
                  }}>Details</button>
                )}
                {allowed("settings") && <button aria-current={page === "settings" ? "page" : undefined} onClick={() => {
                  if (userMenu.current) userMenu.current.open = false;
                  setPage("settings");
                }}>Instellingen</button>}
                <button disabled={loading || checkingSession || loggingOut} onClick={() => runUserAction(refresh)}>
                  {loading ? "Gegevens ophalen..." : "Gegevens ophalen"}
                </button>
                <button disabled={["checking", "downloading", "downloaded", "installing"].includes(updateStatus.state)}
                  onClick={() => runUserAction(() => window.mksDashboard.checkForUpdates())}>
                  {updateStatus.state === "downloading" ? "Update downloaden..." :
                    updateStatus.state === "checking" ? "Updates controleren..." : "Updates controleren"}
                </button>
                {hasSessionId && (
                  <button className="user-menu-logout" disabled={loading || checkingSession || loggingOut}
                    onClick={() => runUserAction(deleteSession)}>
                    {loggingOut ? "Uitloggen..." : "Uitloggen"}
                  </button>
                )}
              </div>
            </details>
          </div>
        </header>

        <section className="content">
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          {refreshSettingError && <div className="notice notice-error" role="alert">{refreshSettingError}</div>}
          {page === "overview" && updateStatus.state !== "idle" && (
            <div
              className={`notice notice-update ${updateStatus.state === "error" ? "notice-error" : ""}`}
              role="status"
            >
              {updateMessage}
            </div>
          )}

          {page === "settings" && currentPageAllowed && (
            <div className="report-page">
            <section className="settings-panel" aria-labelledby="settings-display">
              <div className="settings-heading">
                <h2 id="settings-display">Dashboardinstellingen</h2>
                <p>Pas het vernieuwen van gegevens en de weergave aan.</p>
              </div>
              <div className="settings-option">
                <div className="settings-option-copy">
                  <div className="settings-option-title"><label htmlFor="auto-refresh-toggle">Automatisch vernieuwen</label></div>
                  <p id="auto-refresh-description">Vernieuw je gegevens automatisch tijdens het gebruik van de app. Standaard ingeschakeld.</p>
                </div>
                <input id="auto-refresh-toggle" className="settings-toggle" type="checkbox" checked={autoRefresh}
                  aria-describedby="auto-refresh-description" disabled={!refreshSettingsLoaded}
                  onChange={(event) => changeAutoRefresh(event.target.checked)} />
              </div>
              <form className="settings-option" onSubmit={(event) => { event.preventDefault(); saveRefreshInterval(); }}>
                <div className="settings-option-copy">
                  <div className="settings-option-title">
                    <label htmlFor="refresh-minutes">Gegevens vernieuwen (minuten)</label>
                  </div>
                  <p id="refresh-minutes-description">Haal automatisch je dashboardgegevens op zolang je bent aangemeld. Standaard: 5 minuten.</p>
                </div>
                <div className="welcome-actions">
                  <input id="refresh-minutes" className="session-input" style={{ width: 90 }} type="number" min="1" step="1"
                    aria-describedby="refresh-minutes-description" value={refreshDraft} disabled={!autoRefresh}
                    onChange={(event) => setRefreshDraft(event.target.value)} required />
                  <button className="button button-secondary" type="submit" disabled={!autoRefresh}>Opslaan</button>
                </div>
              </form>
              {appInfo?.channel === "dev" && <div className="settings-option">
                <div className="settings-option-copy">
                  <div className="settings-option-title">
                    <label htmlFor="infoblocks-toggle">Infoblocks</label>
                    <span className="settings-badge">Alleen Dev</span>
                  </div>
                  <p id="infoblocks-description">
                    Toon openbare informatie zoals missies, evenementen en POI's, zonder accountkoppeling.
                  </p>
                </div>
                {appInfo?.channel === "dev" && (
                  <input id="infoblocks-toggle" className="settings-toggle" type="checkbox"
                    aria-describedby="infoblocks-description" checked={infoblocks} disabled={!settingsLoaded}
                    onChange={(event) => changeSetting("infoblocks", event.target.checked)} />
                )}
              </div>}
              {appInfo?.channel === "dev" && (
                <div className="settings-option">
                  <div className="settings-option-copy">
                    <div className="settings-option-title">
                      <label htmlFor="dev-mode-toggle">Dev mode</label>
                      <span className="settings-badge">Alleen Dev</span>
                    </div>
                    <p id="dev-mode-description">
                      Toon Raw API-responses in het menu voor troubleshooting, inclusief de gebruikte URL met afgeschermde SessionID.
                    </p>
                  </div>
                  <input id="dev-mode-toggle" className="settings-toggle" type="checkbox"
                    aria-describedby="dev-mode-description" checked={devMode} disabled={!settingsLoaded}
                    onChange={(event) => changeSetting("dev-mode", event.target.checked)} />
                </div>
              )}
              <div className="settings-footnote">
                Instellingen worden op deze pc onthouden. Huidig vernieuwingsinterval: {refreshMinutes} minuten.
              </div>
            </section>
            <ErrorReportPanel data={data} appInfo={appInfo} lastUpdated={lastUpdated} updateStatus={updateStatus}
              errors={[error, refreshSettingError]} />
            </div>
          )}
          {showDevMode && page === "rawResponses" && <RawResponsesPage data={data} />}
          {checkingSession && !publicPage && page !== "settings" && page !== "rawResponses" && (
            <div className="notice" role="status">Opgeslagen SessionID controleren en gegevens ophalen...</div>
          )}
          {(!data || showSessionForm) && !checkingSession && !publicPage && page !== "settings" && page !== "rawResponses" && (
            <section className="welcome-panel">
              <div className="welcome-icon">M</div>
              <div className="welcome-copy">
                <span className="eyebrow">{data ? "ACCOUNTINSTELLINGEN" : "JOUW LOKALE DASHBOARD"}</span>
                <h2>{data ? "SessionID aanpassen" : "Welkom bij MKS Dashboard Desktop"}</h2>
                <p>
                  Voer de SessionID van Meldkamerspel in.
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
                  <button className="button button-primary" disabled={loading || loggingOut} onClick={() => void saveAndRefresh()}>
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
              {signedIn && <section className="summary-row">
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
              </section>}
              <div className="section-heading">
                <div>
                  <h2>Gegevensbronnen</h2>
                  <p>Kies een onderdeel om de opgehaalde gegevens te bekijken.</p>
                </div>
              </div>
              <section className="resource-grid">
                {visibleResources.map((resource) => {
                  const result = data[resource.key];
                  return (
                    <button className="resource-card" key={resource.key} onClick={() => setPage(resource.key)}>
                      <span className="resource-icon">{resource.label.slice(0, 1)}</span>
                      <span className="resource-text">
                        <strong>{resource.label}</strong>
                        <small>{!result.ok ? "Niet beschikbaar" : resource.key === "pointsOfInterest" ? "Missies per POI-type" :
                          resource.key === "credits" ? "Accountoverzicht" : resource.key === "allianceInfo" ? "Teamkas en leden" :
                            `${resourceCount(data, resource.key)} items`}</small>
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

          {signedIn && currentPageAllowed && <>
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
          </>}
          {showInfoblocks && <>
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
          </>}
        </section>
        <footer className="app-footer">
          <span>
            Versie {appInfo?.version ?? "…"} · {appInfo?.channel === "dev" ? "Dev" : "Stable"}
          </span>
        </footer>
      </main>
    </div>
  );
}

function resourceCount(data: DashboardData, key: DashboardResourceKey): number | string {
  const result = data[key];
  if (key === "schoolings" || key === "allianceSchoolings") {
    const parsed = read(result, schoolingRecords);
    return parsed.ok ? parsed.value.length.toLocaleString("nl-NL") : "—";
  }
  return result.ok ? recordsFrom(result.data).length.toLocaleString("nl-NL") : "—";
}

export default App;
