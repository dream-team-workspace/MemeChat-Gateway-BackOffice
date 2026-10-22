import { Hono } from "hono";

import { authMiddleware } from "../auth/access.js";
import type { AppEnv } from "../types.js";
import { capabilities } from "./capabilities.js";
import { models } from "./models.js";
import { operations } from "./operations.js";
import { users } from "./users.js";

const admin = new Hono<AppEnv>();

admin.use("*", authMiddleware);
admin.route("/capabilities", capabilities);
admin.route("/models", models);
admin.route("/users", users);
admin.route("/cache", operations);

export { admin };
