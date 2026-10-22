import { z } from "zod";

const rawSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "staging", "production"]).optional(),
  PORT: z.coerce.number().int().positive().default(8787),
  APP_ORIGIN: z.string().default("http://127.0.0.1:5173"),
  ADMIN_API_MODE: z.enum(["mock", "live"]).optional(),
  ADMIN_API_BASE_URL: z.string().default("http://127.0.0.1:8080"),
  ADMIN_API_SECRET: z.string().optional(),
  CF_ACCESS_TEAM_DOMAIN: z.string().default("rough-water-d6a6.cloudflareaccess.com"),
  CF_ACCESS_AUD: z.string().optional(),
  DEV_ACTOR_EMAIL: z.string().email().optional(),
  VITE_DEV_AUTH_EMAIL: z.string().email().optional(),
  STATIC_DIR: z.string().default("dist"),
  APP_VERSION: z.string().default("0.1.0"),
  APP_COMMIT: z.string().optional(),
});

const raw = rawSchema.parse(process.env);
const nodeEnv = raw.NODE_ENV;
const environment: "development" | "staging" | "production" =
  raw.APP_ENV ?? (nodeEnv === "production" ? "production" : "development");
const adminApiMode = raw.ADMIN_API_MODE ?? (nodeEnv === "production" ? "live" : "mock");

if (nodeEnv === "production" && adminApiMode !== "live") {
  throw new Error("ADMIN_API_MODE must be live in production");
}
if (nodeEnv === "production" && !raw.ADMIN_API_SECRET) {
  throw new Error("ADMIN_API_SECRET is required in production");
}
if (nodeEnv === "production" && !raw.CF_ACCESS_AUD) {
  throw new Error("CF_ACCESS_AUD is required in production");
}

export const config = {
  nodeEnv,
  environment,
  isProduction: nodeEnv === "production",
  port: raw.PORT,
  appOrigin: raw.APP_ORIGIN.replace(/\/$/, ""),
  adminApiMode,
  adminApiBaseUrl: raw.ADMIN_API_BASE_URL.replace(/\/$/, ""),
  adminApiSecret: raw.ADMIN_API_SECRET ?? "",
  cfAccessTeamDomain: raw.CF_ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, ""),
  cfAccessAud: raw.CF_ACCESS_AUD ?? "",
  devActorEmail:
    raw.DEV_ACTOR_EMAIL ?? raw.VITE_DEV_AUTH_EMAIL ?? "operator@dream-team.works",
  staticDir: raw.STATIC_DIR,
  version: raw.APP_VERSION,
  commit: raw.APP_COMMIT,
} as const;

export type Config = typeof config;
