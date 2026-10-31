import { contextBridge, ipcRenderer } from "electron";
import type { MksDashboardApi } from "../shared/contracts";

const api: MksDashboardApi = {
  getAuthStatus: () => ipcRenderer.invoke("auth:status"),
  setSessionId: (sessionId, remember) => ipcRenderer.invoke("auth:set-session-id", sessionId, remember),
  logout: () => ipcRenderer.invoke("auth:logout"),
  loadDashboard: () => ipcRenderer.invoke("dashboard:load"),
};

contextBridge.exposeInMainWorld("mksDashboard", api);
