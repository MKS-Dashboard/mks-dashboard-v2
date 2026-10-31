import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell, type IpcMainInvokeEvent } from "electron";
import { autoUpdater } from "electron-updater";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getUpdateFeed } from "./update-feed";
import { allowedExternalUrl, loadReference } from "./reference-data";
import {
  dashboardResources,
  type AuthStatus,
  type DashboardData,
  type DashboardResourceKey,
  type DashboardResourceResult,
  type UpdateStatus,
} from "../shared/contracts";

const GAME_ORIGIN = "https://meldkamerspel.com";
const isBetaApp = !app.isPackaged || /-beta(?:\.|$)/.test(app.getVersion());
const productName = isBetaApp ? "MKS Dashboard Beta" : "MKS Dashboard";
if (isBetaApp) {
  app.setName(productName);
  app.setPath("userData", resolve(app.getPath("appData"), productName));
}
if (process.platform === "win32") {
  app.setAppUserModelId(isBetaApp ? "com.mksdashboard.desktop.beta" : "com.mksdashboard.desktop");
}
const mainDirectory = dirname(fileURLToPath(import.meta.url));
const sessionIdFile = resolve(app.getPath("userData"), "session-id.enc");

let mainWindow: BrowserWindow | null = null;
let sessionId: string | null = null;
let sessionIdLoaded = false;
let updateStatus: UpdateStatus = { state: "idle" };
let updateExecuting = false;

function assertMainWindow(event: IpcMainInvokeEvent): void {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error("Dit verzoek is niet afkomstig van het app-venster.");
  }
}

function setUpdateStatus(status: UpdateStatus): void {
  updateStatus = status;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updates:status-changed", status);
  }
}

async function checkForUpdates(): Promise<void> {
  if (!app.isPackaged) return;
  if (updateExecuting || updateStatus.state === "checking" || updateStatus.state === "downloaded") return;

  setUpdateStatus({ state: "checking" });
  try {
    const url = await getUpdateFeed(/-beta(?:\.|$)/.test(app.getVersion()));
    autoUpdater.setFeedURL({ provider: "generic", url });
    await autoUpdater.checkForUpdates();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Controleren op updates is mislukt.";
    console.error("Controleren op updates is mislukt:", error);
    setUpdateStatus({ state: "error", message });
  }
}

function configureAutoUpdates(): void {
  if (!app.isPackaged) return;

  const isDevChannel = /-beta(?:\.|$)/.test(app.getVersion());
  autoUpdater.channel = isDevChannel ? "beta" : "latest";
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = isDevChannel;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("update-available", (info) => {
    setUpdateStatus({ state: "available", version: info.version });
  });
  autoUpdater.on("download-progress", (progress) => {
    setUpdateStatus({
      state: "downloading",
      version: updateStatus.version,
      percent: Math.round(progress.percent),
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    setUpdateStatus({ state: "downloaded", version: info.version });
  });
  autoUpdater.on("update-not-available", () => {
    setUpdateStatus({ state: "up-to-date" });
  });
  autoUpdater.on("error", (error) => {
    updateExecuting = false;
    console.error("De automatische update is mislukt:", error);
    setUpdateStatus({ state: "error", message: error.message });
  });

  setTimeout(() => {
    void checkForUpdates();
  }, 8_000);
  setInterval(() => {
    void checkForUpdates();
  }, 4 * 60 * 60 * 1_000);
}

function getDisplayVersion(version: string): string {
  const match = /^(\d{4})\.(\d{2})(\d{2})\.(\d{2})(\d{2})(?:-|$)/.exec(version);
  if (!match) return version;

  const [, year, month, day, hour, minute] = match;
  return `${year}.${month}.${day}.${hour}.${minute}`;
}

async function loadSessionId(): Promise<string | null> {
  if (sessionIdLoaded) return sessionId;

  if (!existsSync(sessionIdFile)) {
    sessionIdLoaded = true;
    return null;
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Windows kan de opgeslagen SessionID niet ontsleutelen.");
  }

  const encryptedSessionId = await readFile(sessionIdFile);
  sessionId = safeStorage.decryptString(encryptedSessionId);
  sessionIdLoaded = true;
  return sessionId;
}

async function setSessionId(value: unknown, remember: unknown): Promise<void> {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 512) {
    throw new Error("Voer een geldige SessionID in.");
  }
  if (typeof remember !== "boolean") {
    throw new Error("De instelling voor lokaal bewaren is ongeldig.");
  }

  const cleanedSessionId = value.trim();
  if (remember) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Versleutelde opslag is niet beschikbaar. De SessionID is niet opgeslagen.");
    }

    await mkdir(dirname(sessionIdFile), { recursive: true });
    const temporaryFile = `${sessionIdFile}.tmp`;
    try {
      await writeFile(temporaryFile, safeStorage.encryptString(cleanedSessionId));
      await rename(temporaryFile, sessionIdFile);
    } catch (error) {
      await rm(temporaryFile, { force: true });
      throw error;
    }
  } else {
    await rm(sessionIdFile, { force: true });
  }

  sessionId = cleanedSessionId;
  sessionIdLoaded = true;
}

async function getAuthStatus(): Promise<AuthStatus> {
  return { hasSessionId: Boolean(await loadSessionId()) };
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Er is een onbekende fout opgetreden.";
}

async function requestGameResource(
  key: DashboardResourceKey,
  endpoint: string,
  sessionRequired: boolean,
): Promise<[DashboardResourceKey, DashboardResourceResult]> {
  let diagnosticUrl = new URL(endpoint, GAME_ORIGIN).href;
  try {
    const currentSessionId = await loadSessionId();
    if (sessionRequired && !currentSessionId) {
      throw new Error("Voer eerst je Meldkamerspel-SessionID in.");
    }

    const requestUrl = new URL(endpoint, GAME_ORIGIN);
    if (sessionRequired && currentSessionId) {
      requestUrl.searchParams.set("_session_id", currentSessionId);
      diagnosticUrl = `${diagnosticUrl}?_session_id=[afgeschermd]`;
    }
    const response = await fetch(requestUrl, {
      headers: {
        Accept: "application/json",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });

    if (response.status >= 300 && response.status < 400) {
      throw new Error("Je sessie is verlopen of je bent niet aangemeld. Meld opnieuw aan.");
    }
    if (!response.ok) {
      throw new Error(`De game-API gaf HTTP ${response.status} terug.`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("json")) {
      throw new Error("De game-API heeft geen JSON teruggegeven. Meld opnieuw aan en probeer het nog eens.");
    }

    return [key, { ok: true, data: await response.json(), requestUrl: diagnosticUrl }];
  } catch (error) {
    return [key, { ok: false, error: asErrorMessage(error), requestUrl: diagnosticUrl }];
  }
}

async function loadDashboard(): Promise<DashboardData> {
  const results = await Promise.all(
    dashboardResources.map(({ key, endpoint, sessionRequired = true }) =>
      requestGameResource(key, endpoint, sessionRequired),
    ),
  );
  return Object.fromEntries(results) as DashboardData;
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 880,
    minHeight: 600,
    title: productName,
    icon: app.isPackaged ? resolve(process.resourcesPath, "icon.png") : resolve(mainDirectory, "../../build/icon.png"),
    backgroundColor: "#f4f6fb",
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolve(mainDirectory, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    const isLocalRenderer = rendererUrl ? url.startsWith(rendererUrl) : url.startsWith("file://");
    if (!isLocalRenderer) event.preventDefault();
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(resolve(mainDirectory, "../renderer/index.html"));
  }
}

ipcMain.handle("auth:status", async (event) => {
  assertMainWindow(event);
  return getAuthStatus();
});

ipcMain.handle("reference:load", async (event, key: unknown) => {
  assertMainWindow(event);
  return loadReference(key);
});

ipcMain.handle("external:open", async (event, value: unknown) => {
  assertMainWindow(event);
  await shell.openExternal(allowedExternalUrl(value));
});

ipcMain.handle("report:save", async (event, report: unknown) => {
  assertMainWindow(event);
  if (typeof report !== "string" || !report.trim()) {
    throw new Error("Het errorrapport bevat geen geldige tekst.");
  }
  const owner = BrowserWindow.fromWebContents(event.sender);
  if (!owner) throw new Error("Het app-venster is niet beschikbaar.");
  const result = await dialog.showSaveDialog(owner, {
    title: "Errorrapport opslaan",
    defaultPath: resolve(app.getPath("downloads"), `MKS-Dashboard-errorrapport-${Date.now()}.txt`),
    filters: [{ name: "Tekstbestand", extensions: ["txt"] }],
  });
  if (result.canceled) return false;
  if (!result.filePath) throw new Error("Er is geen bestandslocatie gekozen voor het errorrapport.");
  await writeFile(result.filePath, report, "utf8");
  return true;
});

ipcMain.handle("auth:set-session-id", async (event, value: unknown, remember: unknown) => {
  assertMainWindow(event);
  await setSessionId(value, remember);
});

ipcMain.handle("auth:logout", async (event) => {
  assertMainWindow(event);
  await rm(sessionIdFile, { force: true });
  sessionId = null;
  sessionIdLoaded = true;
});

ipcMain.handle("dashboard:load", async (event) => {
  assertMainWindow(event);
  return loadDashboard();
});

ipcMain.handle("app:info", (event) => {
  assertMainWindow(event);
  const version = app.getVersion();
  return {
    version: getDisplayVersion(version),
    channel: isBetaApp ? "dev" : "stable",
  };
});

ipcMain.handle("updates:status", (event) => {
  assertMainWindow(event);
  return updateStatus;
});

ipcMain.handle("updates:check", async (event) => {
  assertMainWindow(event);
  await checkForUpdates();
});

ipcMain.handle("updates:install", async (event) => {
  assertMainWindow(event);
  if (updateExecuting || !["available", "downloaded"].includes(updateStatus.state)) {
    throw new Error("Er is geen update klaar om uit te voeren.");
  }
  updateExecuting = true;
  try {
    if (updateStatus.state === "available") {
      setUpdateStatus({ state: "downloading", version: updateStatus.version, percent: 0 });
      await autoUpdater.downloadUpdate();
    }
    setUpdateStatus({ state: "installing", version: updateStatus.version });
    autoUpdater.quitAndInstall(false, true);
  } catch (cause) {
    updateExecuting = false;
    console.error("Update uitvoeren is mislukt:", cause);
    setUpdateStatus({ state: "error", message: asErrorMessage(cause) });
    throw cause;
  }
});

app.whenReady().then(() => {
  createMainWindow();
  configureAutoUpdates();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
