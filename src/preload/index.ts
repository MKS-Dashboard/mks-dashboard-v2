import { contextBridge, ipcRenderer } from "electron";
import type { MksDashboardApi, UpdateStatus } from "../shared/contracts";

const api: MksDashboardApi = {
  getAuthStatus: () => ipcRenderer.invoke("auth:status"),
  setSessionId: (sessionId, remember) => ipcRenderer.invoke("auth:set-session-id", sessionId, remember),
  logout: () => ipcRenderer.invoke("auth:logout"),
  loadDashboard: () => ipcRenderer.invoke("dashboard:load"),
  loadReference: (key) => ipcRenderer.invoke("reference:load", key),
  openExternal: (url) => ipcRenderer.invoke("external:open", url),
  saveErrorReport: (report) => ipcRenderer.invoke("report:save", report),
  getAppInfo: () => ipcRenderer.invoke("app:info"),
  getUpdateStatus: () => ipcRenderer.invoke("updates:status"),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  installUpdate: () => ipcRenderer.invoke("updates:install"),
  onUpdateStatus: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => listener(status);
    ipcRenderer.on("updates:status-changed", handler);
    return () => ipcRenderer.removeListener("updates:status-changed", handler);
  },
};

contextBridge.exposeInMainWorld("mksDashboard", api);
