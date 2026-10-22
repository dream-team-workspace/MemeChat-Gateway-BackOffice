import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

import { config } from "./config.js";
import { errorHandler } from "./lib/errors.js";
import { admin } from "./routes/admin.js";
import { healthHandler, metaHandler } from "./routes/health.js";
import type { AppEnv } from "./types.js";

const app = new Hono<AppEnv>();

app.use("*", async (c, next) => {
  const requestId = c.req.header("X-Request-Id") ?? crypto.randomUUID();
  c.set("requestId", requestId);
  c.header("X-Request-Id", requestId);
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Frame-Options", "DENY");
  await next();
});

app.get("/api/health", healthHandler);
app.get("/api/meta", metaHandler);
app.route("/api/admin", admin);

app.all("/api/*", (c) =>
  c.json(
    {
      code: "NOT_FOUND",
      message: "API route not found.",
      requestId: c.get("requestId"),
    },
    404,
  ),
);

app.use("*", serveStatic({ root: config.staticDir }));
app.get("*", async (c) => {
  try {
    const html = await readFile(resolve(config.staticDir, "index.html"), "utf8");
    return c.html(html);
  } catch {
    return c.text("Not found", 404);
  }
});

app.onError(errorHandler);

export { app };
