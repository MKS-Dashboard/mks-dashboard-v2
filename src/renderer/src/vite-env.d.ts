/// <reference types="vite/client" />

import type { MksDashboardApi } from "../../shared/contracts";

declare global {
  interface Window {
    mksDashboard: MksDashboardApi;
  }
}
