import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolveSiteUrl } from "./scripts/site-url.ts";
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_SITE_URL": JSON.stringify(resolveSiteUrl({
      ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env,
    })),
  },
  server: { proxy: { "/api": "http://localhost:3001" } },
  build: { sourcemap: false },
}));
