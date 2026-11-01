import { useCallback, useEffect, useRef, useState } from "react";
import { BuildingsPage, ProgressPage, read, VehiclesPage, VehicleDetailsPage } from "./DashboardPages";
import { schoolingRecords } from "./schoolings";
import { defaultRefreshMinutes, parseRefreshMinutes, refreshCountdown, refreshDue } from "./refresh-interval";
import { accountUsername, AccountPage, AlliancePage, BuildingDetailsPage, CreditsPage, SchoolingsPage, SuggestionsPage } from "./AccountPages";
import { AllianceEventsPage, AllianceMissionsPage, AwardsPage, EventsPage, InformationPage, MissionsPage, PlannedMissionsPage, POIPage } from "./InformationPages";
import { infoblocksAllowed, isInfoblockPage } from "./infoblocks";
import { RawResponsesPage } from "./RawResponsesPage";
import { ErrorReportPanel } from "./ErrorReportPanel";
import { EquipmentsPage } from "./EquipmentsPage";
import { clearReportIssues, recordAppIssue } from "./error-report";
import { extraPages, navigationGroups, navigationPages, pageAllowed, type PageKey } from "./navigation";
import {
  dashboardResources,
  type AppInfo,
  type DashboardData,
  type DashboardResourceKey,
  type UpdateStatus,
} from "../../shared/contracts";

declare const __PROJECT_STATS__: { files: number; lines: number };

function recordsFrom(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const nestedArray = Object.values(data).find(Array.isArray);
    if (nestedArray) return nestedArray;
  }
  return data === null || data === undefined ? [] : [data];
}

export function RefreshCountdown({ lastUpdated, minutes }: { lastUpdated: Date; minutes: number }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lastUpdated, minutes]);
  return <span>Vernieuwen over {refreshCountdown(lastUpdated.getTime(), now, minutes)}</span>;
}

export function OverviewSummary({ data, username, lastUpdated, loading, autoRefresh, refreshMinutes, onNavigate, onRefresh }: {
  data: DashboardData; username: string | null; lastUpdated: Date | null; loading: boolean;
  autoRefresh: boolean; refreshMinutes: number; onNavigate: (page: PageKey) => void; onRefresh: () => void;
}) {
  const balances = read(data.credits, (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("De accountgegevens hebben een ongeldig formaat.");
    }
    function amount(input: unknown): string {
      if (input === undefined || input === null) return "Niet beschikbaar";
      const number = typeof input === "number" ? input :
        typeof input === "string" && /^-?\d+(?:\.\d+)?$/.test(input.trim()) ? Number(input) : NaN;
      if (!Number.isFinite(number)) throw new Error("Het accountsaldo heeft een ongeldig formaat.");
      return number.toLocaleString("nl-NL", { maximumFractionDigits: 2 });
    }
    const account = value as Record<string, unknown>;
    return {
      credits: amount(account.credits_user_current ?? account.credits),
      coins: amount(account.coins_user_current ?? account.coins),
    };
  });
  const cards = [
    { label: "Voertuigen", value: resourceCount(data, "vehicles"), hint: "klaar voor jouw inzetten", page: "vehicles" },
    { label: "Gebouwen", value: resourceCount(data, "buildings"), hint: "jouw netwerk van locaties", page: "buildings" },
    { label: "Credits", value: balances.ok ? balances.value.credits : "Niet beschikbaar", hint: "beschikbaar saldo", page: "credits" },
    { label: "Coins", value: balances.ok ? balances.value.coins : "Niet beschikbaar", hint: "beschikbaar saldo", page: "credits" },
  ] as const;
  return (
    <div className="overview-summary">
      <section className="overview-welcome" aria-labelledby="overview-welcome-title">
        <div>
          <span className="eyebrow">JOUW MELDKAMER IN BEELD</span>
          <h2 id="overview-welcome-title">{username ? `Welkom terug, ${username}` : "Welkom terug"}</h2>
          <p>Je voertuigen, locaties en team. Alles op één plek.</p>
        </div>
        <button className="button button-primary" disabled={loading} onClick={onRefresh}>
          {loading ? "Gegevens ophalen..." : "Gegevens vernieuwen"}
        </button>
      </section>
      <div className="overview-refresh" role="status">
        <span>{loading ? "Je gegevens worden vernieuwd..." : lastUpdated
          ? `Laatst opgehaald: ${lastUpdated.toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}`
          : "Nog geen gegevens opgehaald"}</span>
        <span>{autoRefresh ? `Automatisch vernieuwen: elke ${refreshMinutes} ${refreshMinutes === 1 ? "minuut" : "minuten"}` : "Automatisch vernieuwen staat uit"}</span>
      </div>
      {!balances.ok && <div className="notice notice-error" role="alert">{balances.error}</div>}
      <section className="summary-row" aria-label="Jouw statistieken">
        {cards.map((card) => (
          <button className="summary-card overview-stat" key={card.label} onClick={() => onNavigate(card.page)}>
            <span className="overview-stat-heading">
              <span className="summary-label">{card.label}</span>
              <span className="overview-stat-icon" aria-hidden="true">{card.label.slice(0, 1)}</span>
            </span>
            <strong>{card.value}</strong>
            <span className="summary-hint">{card.hint}</span>
          </button>
        ))}
      </section>
      <nav className="overview-shortcuts" aria-label="Snelle acties">
        <span>Direct naar</span>
        <button className="button button-secondary" onClick={() => onNavigate("allianceInfo")}>Mijn team</button>
        <button className="button button-secondary" onClick={() => onNavigate("progressdata")}>Capaciteit</button>
        <button className="button button-secondary" onClick={() => onNavigate("schoolings")}>Opleidingen</button>
        <button className="button button-secondary" onClick={() => onNavigate("settings")}>Instellingen</button>
      </nav>
    </div>
  );
}

export function UsageRegistrationNotice() {
  return (
    <div className="session-help">
      <p>De app verzamelt gebruiksgegevens.</p>
      <details>
        <summary>Meer details</summary>
        <p>
          Bij aanmelden sturen we je speler-ID, spelersnaam, appversie en of je Beta gebruikt naar de
          developer om eerste en laatste gebruik bij te houden.
          Maximaal eenmaal succesvol per kalenderdag (Nederlandse tijd) per account op deze installatie.
          Je SessionID en overige spelgegevens worden niet meegestuurd.
          Bij een fout kan de app het bij een volgende gegevensverversing opnieuw proberen.
        </p>
      </details>
    </div>
  );
}

export function AboutPage({ appInfo }: { appInfo: AppInfo | null }) {
  const [linkError, setLinkError] = useState("");
  const links = [
    ["Project op GitHub", "https://github.com/MKS-Dashboard/mks-dashboard-v2"],
    ["Releaseopmerkingen", "https://github.com/MKS-Dashboard/mks-dashboard-v2/releases"],
    ["Probleem melden of suggestie doen", "https://github.com/MKS-Dashboard/mks-dashboard-v2/issues/new"],
    ["Bijdragers", "https://github.com/MKS-Dashboard/mks-dashboard-v2/graphs/contributors"],
    ["Oorspronkelijke webapp", "https://github.com/MKS-Dashboard/mks-dashboard.github.io"],
    ["Meldkamerspel", "https://meldkamerspel.com"],
    ["Openbare missiegegevens", "https://github.com/Piet2001/Missionfiles-All-Versions"],
  ] as const;
  async function openLink(url: string): Promise<void> {
    setLinkError("");
    try {
      await window.mksDashboard.openExternal(url);
    } catch (cause) {
      setLinkError(cause instanceof Error ? cause.message : "De link kon niet worden geopend.");
    }
  }
  return (
    <section className="settings-panel" aria-labelledby="about-title">
      <div className="settings-heading">
        <h2 id="about-title">Over de app</h2>
        <p>{appInfo ? `Versie ${appInfo.version} — ${appInfo.channel === "dev" ? "Beta" : "Stable"}` : "Versie laden..."}</p>
      </div>
      <div className="settings-option">
        <div className="settings-option-copy">
          <h3>Over MKS Dashboard</h3>
          <p>Een Windows-app met overzicht over je Meldkamerspel-account, voertuigen, gebouwen en team.</p>
          <p>Een project van MKS Dashboard, gebaseerd op de oorspronkelijke webapp en onderhouden met hulp van bijdragers.</p>
          <p>Dit is een onafhankelijk project, geen officiële app van Meldkamerspel.</p>
          <h4>Het project in cijfers</h4>
          <p>{__PROJECT_STATS__.files.toLocaleString("nl-NL")} broncodebestanden en
            {" "}{__PROJECT_STATS__.lines.toLocaleString("nl-NL")} niet-lege regels broncode.</p>
          <p>Inclusief tests en buildscripts; exclusief databestanden, documentatie, dependencies en
            gegenereerde bestanden. Commentaarregels tellen mee. Gemeten bij het starten of bouwen van deze versie.</p>
        </div>
      </div>
      <div className="settings-option">
        <div className="settings-option-copy">
          <h3>Privacy</h3>
          <p>De app leest je spelgegevens rechtstreeks bij Meldkamerspel en wijzigt niets in je spelaccount.</p>
          <p>Je SessionID wordt alleen naar Meldkamerspel gestuurd. Je kunt deze versleuteld op je pc bewaren.
            Behandel je SessionID als een wachtwoord en deel deze nooit.</p>
          <h4>Gebruiksregistratie</h4>
          <UsageRegistrationNotice />
        </div>
      </div>
      <div className="settings-option">
        <div className="settings-option-copy">
          <h3>Links &amp; credits</h3>
          <p>Spelgegevens komen van Meldkamerspel. De vaste spelcatalogi zijn gebaseerd op de oorspronkelijke
            webapp; aanvullende openbare missiegegevens komen uit Missionfiles-All-Versions.</p>
          <p>Gebouwd met Electron, React en TypeScript. Met dank aan de makers van de gebruikte software,
            gegevensbronnen en alle projectbijdragers.</p>
          {linkError && <div className="notice notice-error" role="alert">{linkError}</div>}
          <ul>
            {links.map(([label, url]) => (
              <li key={url}>
                <a href={url} onClick={(event) => {
                  event.preventDefault();
                  void openLink(url);
                }}>{label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function SessionIdInstructions() {
  return (
    <details className="session-help">
      <summary>Hoe vind ik mijn SessionID?</summary>
      <ol>
        <li>Open <code>https://meldkamerspel.com</code> in je browser en log in op je spelaccount.</li>
        <li>Druk op <kbd>F12</kbd> om de ontwikkelaarstools van die browser te openen, niet die van de dashboardapp.</li>
        <li>
          <strong>Chrome / Edge:</strong> kies <strong>Application (Applicatie)</strong>, open
          {" "}<strong>Cookies</strong> onder <strong>Storage (Opslag)</strong> en selecteer de Meldkamerspel-website.
          <br />
          <strong>Firefox:</strong> kies <strong>Storage (Opslag)</strong>, open <strong>Cookies</strong> en
          selecteer de Meldkamerspel-website.
        </li>
        <li>Zoek de cookie <code>_session_id</code> en kopieer alleen de <strong>Value (Waarde)</strong>, niet de cookienaam.</li>
        <li>Plak deze waarde in het SessionID-veld hierboven en klik op <strong>SessionID opslaan en ophalen</strong>.</li>
      </ol>
      <p>Behandel je SessionID als een wachtwoord: deel deze nooit, ook niet in screenshots of foutrapporten.</p>
    </details>
  );
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
  const [usageError, setUsageError] = useState("");
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
  const [selectedVehicleTypeId, setSelectedVehicleTypeId] = useState<number | null>(null);
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string | null>(null);
  const [gameVersion, setGameVersion] = useState<"brandweer" | "politie">("brandweer");

  useEffect(() => {
    if (error) recordAppIssue("App", error);
    if (usageError) recordAppIssue("Gebruiksregistratie", usageError);
    if (refreshSettingError) recordAppIssue("Instellingen", refreshSettingError);
  }, [error, usageError, refreshSettingError]);

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
      const version = localStorage.getItem("mks-game-version");
      if (enabled !== null && enabled !== "true" && enabled !== "false") {
        throw new Error("De opgeslagen instelling voor automatisch vernieuwen is ongeldig.");
      }
      const minutes = saved === null ? defaultRefreshMinutes : parseRefreshMinutes(saved);
      setRefreshMinutes(minutes);
      setRefreshDraft(String(minutes));
      setAutoRefresh(enabled !== "false");
      if (version === "politie" || version === "brandweer") {
        setGameVersion(version);
      }
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

  function changeGameVersion(version: "brandweer" | "politie"): void {
    try {
      localStorage.setItem("mks-game-version", version);
      setGameVersion(version);
    } catch (cause) {
      setRefreshSettingError(cause instanceof Error ? cause.message : "De spelversie kon niet worden opgeslagen.");
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
      if (result.credits.ok) {
        try {
          await window.mksDashboard.logUserUsage();
          setUsageError("");
        } catch (cause) {
          setUsageError(cause instanceof Error
            ? `Gebruiksregistratie: ${cause.message}` : "Gebruiksregistratie is mislukt. Je kunt het dashboard blijven gebruiken.");
        }
      }
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
    }, 1000);
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
    setUsageError("");
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
      setSelectedEquipmentType(null);
      clearReportIssues();
      setLastUpdated(null);
      setShowSessionForm(true);
      setPage("overview");
      setError("");
      setUsageError("");
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
  const selectedLabel = page === "about" ? "Over de app" : page === "settings" ? "Instellingen" : page === "rawResponses" ? "Raw API-responses" :
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
          {visiblePages.filter((item) => item.key === "vehicles" || item.key === "equipments").map(navigationButton)}
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
          {visiblePages.filter((item) => item.key !== "vehicles" && item.key !== "equipments" &&
            !navigationGroups.some((group) => group.pages.includes(item.key))).map(navigationButton)}
          {showDevMode && (
            <button className={`nav-item ${page === "rawResponses" ? "active" : ""}`} onClick={() => setPage("rawResponses")}>
              <span className="nav-icon">D</span> Raw API-responses
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <span className={`status-dot ${signedIn ? "connected" : ""}`} />
          {checkingSession ? <span>SessionID controleren</span>
            : signedIn ? loading ? <span>Gegevens ophalen...</span>
              : loggingOut ? <span>Uitloggen...</span>
                : !autoRefresh ? <span>Automatisch vernieuwen uit</span>
                  : updating || !refreshSettingsLoaded || !lastUpdated ? <span>Vernieuwen gepauzeerd</span>
                    : <RefreshCountdown lastUpdated={lastUpdated} minutes={refreshMinutes} />
              : <span>{hasSessionId ? "SessionID ingesteld" : "Geen SessionID ingesteld"}</span>}
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
                <button aria-current={page === "about" ? "page" : undefined} onClick={() => {
                  if (userMenu.current) userMenu.current.open = false;
                  setPage("about");
                }}>Over de app</button>
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
          {usageError && <div className="notice notice-error" role="alert">{usageError}</div>}
          {page === "about" && <AboutPage appInfo={appInfo} />}
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
              <div className="settings-option">
                <div className="settings-option-copy">
                  <div className="settings-option-title">
                    <label htmlFor="game-version-select">Spelversie</label>
                  </div>
                  <p id="game-version-description">Kies welke spelversie je gebruikt. Dit bepaalt naar welke server gegevens worden opgehaald.</p>
                </div>
                <select id="game-version-select" className="settings-select" value={gameVersion}
                  aria-describedby="game-version-description" disabled={!refreshSettingsLoaded}
                  onChange={(event) => changeGameVersion(event.target.value as "brandweer" | "politie")}>
                  <option value="brandweer">Brandweer (meldkamerspel.com)</option>
                  <option value="politie">Politie (politie.meldkamerspel.com)</option>
                </select>
              </div>
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
              errors={[error, usageError, refreshSettingError]} />
            </div>
          )}
          {showDevMode && page === "rawResponses" && <RawResponsesPage data={data} />}
          {checkingSession && !publicPage && page !== "settings" && page !== "about" && page !== "rawResponses" && (
            <div className="notice" role="status">Opgeslagen SessionID controleren en gegevens ophalen...</div>
          )}
          {(!data || showSessionForm) && !checkingSession && !publicPage && page !== "settings" && page !== "about" && page !== "rawResponses" && (
            <section className="welcome-panel">
              <div className="welcome-icon">M</div>
              <div className="welcome-copy">
                <span className="eyebrow">{data ? "ACCOUNTINSTELLINGEN" : "JOUW LOKALE DASHBOARD"}</span>
                <h2>{data ? "SessionID aanpassen" : "Welkom bij MKS Dashboard Desktop"}</h2>
                <p>
                  Voer de SessionID van Meldkamerspel in.
                </p>
                <UsageRegistrationNotice />
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
                <SessionIdInstructions />
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
              {signedIn && <OverviewSummary data={data} username={username} lastUpdated={lastUpdated}
                loading={loading} autoRefresh={autoRefresh} refreshMinutes={refreshMinutes}
                onNavigate={setPage} onRefresh={() => void refresh()} />}
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
          {page === "equipments" && data && <EquipmentsPage result={data.equipments}
            buildingsResult={data.buildings} vehiclesResult={data.vehicles} selectedType={selectedEquipmentType}
            onShowDetails={setSelectedEquipmentType} onBack={() => setSelectedEquipmentType(null)} />}
          {page === "vehicles" && data && selectedVehicleTypeId === null && <VehiclesPage result={data.vehicles} onShowDetails={(id) => setSelectedVehicleTypeId(id)} />}
          {page === "vehicles" && data && selectedVehicleTypeId !== null && <VehicleDetailsPage result={data.vehicles} buildingsResult={data.buildings} vehicleTypeId={selectedVehicleTypeId} gameVersion={gameVersion} onBack={() => setSelectedVehicleTypeId(null)} />}
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
