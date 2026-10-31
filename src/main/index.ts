import { app, BrowserWindow, ipcMain, safeStorage, type IpcMainInvokeEvent } from "electron";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  dashboardResources,
  type AuthStatus,
  type DashboardData,
  type DashboardResourceKey,
  type DashboardResourceResult,
} from "../shared/contracts";

const GAME_ORIGIN = "https://meldkamerspel.com";
const mainDirectory = dirname(fileURLToPath(import.meta.url));
const sessionIdFile = resolve(app.getPath("userData"), "session-id.enc");

let mainWindow: BrowserWindow | null = null;
let sessionId: string | null = null;
let sessionIdLoaded = false;

function assertMainWindow(event: IpcMainInvokeEvent): void {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error("Dit verzoek is niet afkomstig van het app-venster.");
  }
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
  try {
    const currentSessionId = await loadSessionId();
    if (sessionRequired && !currentSessionId) {
      throw new Error("Voer eerst je Meldkamerspel-SessionID in.");
    }

    const requestUrl = new URL(endpoint, GAME_ORIGIN);
    if (sessionRequired && currentSessionId) {
      requestUrl.searchParams.set("_session_id", currentSessionId);
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

    return [key, { ok: true, data: await response.json() }];
  } catch (error) {
    return [key, { ok: false, error: asErrorMessage(error) }];
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
    title: "MKS Dashboard",
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

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
