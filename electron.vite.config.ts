import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { projectStats } from "./scripts/project-stats";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    define: {
      __PROJECT_STATS__: JSON.stringify(projectStats(fileURLToPath(new URL(".", import.meta.url)))),
    },
    plugins: [react()],
  },
});
