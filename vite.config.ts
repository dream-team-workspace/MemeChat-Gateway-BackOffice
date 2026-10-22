import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Cloudflare Tunnel forwards the public Host header. Localhost is allowed
    // by Vite automatically; the console hostnames are allowed for preview and
    // Access testing behind the tunnel.
    allowedHosts: [".dream-team.works", "console.dream-team.works", "console-staging.dream-team.works"],
  },
  preview: {
    allowedHosts: [".dream-team.works", "console.dream-team.works", "console-staging.dream-team.works"],
  },
});
