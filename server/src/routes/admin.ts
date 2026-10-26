import { Hono } from "hono";

import { authMiddleware } from "../auth/access.js";
import type { AppEnv } from "../types.js";
import { appClients } from "./app-clients.js";
import { capabilities } from "./capabilities.js";
import { models } from "./models.js";
import { operations } from "./operations.js";
import { providers } from "./providers.js";
import { revenuecat } from "./revenuecat.js";
import { users } from "./users.js";

const admin = new Hono<AppEnv>();

admin.use("*", authMiddleware);
admin.route("/app-clients", appClients);
admin.route("/capabilities", capabilities);
admin.route("/models", models);
admin.route("/users", users);
admin.route("/cache", operations);
admin.route("/revenuecat", revenuecat);
admin.route("/providers", providers);

export { admin };
