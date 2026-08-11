import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ mode }) => {
  const isAppsScript = mode === "apps-script";

  return {
    base: "./",
    plugins: [react(), ...(isAppsScript ? [viteSingleFile()] : [])],
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
    },
    build: {
      outDir: isAppsScript ? "apps-script-dist" : "dist",
      emptyOutDir: true,
    },
    test: {
      environment: "jsdom",
      coverage: {
        reporter: ["text", "html"],
      },
    },
  };
});
