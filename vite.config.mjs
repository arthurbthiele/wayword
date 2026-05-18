import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/wayword/",
  // react-graph-vis transitively imports an old uuid that references Node's
  // `global`. Browsers don't have it; map it to globalThis at build time.
  define: {
    global: "globalThis",
  },
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
