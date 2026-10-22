import "./env.js";

import { serve } from "@hono/node-server";

import { app } from "./app.js";
import { config } from "./config.js";

const server = serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.log(
      JSON.stringify({
        level: "info",
        message: "backoffice bff listening",
        port: info.port,
        environment: config.environment,
        adminApiMode: config.adminApiMode,
      }),
    );
  },
);

function shutdown(signal: string) {
  console.log(JSON.stringify({ level: "info", message: "shutting down", signal }));
  server.close(() => process.exit(0));
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
