import { createRemoteJWKSet, jwtVerify } from "jose";

import type { MiddlewareHandler } from "hono";

import { config } from "../config.js";
import { HttpError } from "../lib/errors.js";
import type { Actor, AppEnv } from "../types.js";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksTeam = "";

function getJwks() {
  if (!jwks || jwksTeam !== config.cfAccessTeamDomain) {
    jwksTeam = config.cfAccessTeamDomain;
    jwks = createRemoteJWKSet(
      new URL("https://" + config.cfAccessTeamDomain + "/cdn-cgi/access/certs"),
    );
  }
  return jwks;
}

export async function resolveActor(request: Request): Promise<Actor> {
  if (!config.isProduction) {
    return { email: config.devActorEmail };
  }

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) {
    throw new HttpError(401, "UNAUTHENTICATED", "Cloudflare Access token is missing.");
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: "https://" + config.cfAccessTeamDomain,
      audience: config.cfAccessAud,
    });

    if (typeof payload.email !== "string" || payload.email.trim() === "") {
      throw new HttpError(401, "UNAUTHENTICATED", "Access identity has no email.");
    }

    return { email: payload.email };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "UNAUTHENTICATED", "Cloudflare Access verification failed.");
  }
}

export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const actor = await resolveActor(c.req.raw);
  c.set("actor", actor);

  if (config.isProduction && c.req.method !== "GET") {
    const origin = c.req.header("Origin");
    if (origin !== config.appOrigin) {
      throw new HttpError(403, "FORBIDDEN", "Origin mismatch.");
    }
  }

  await next();
};
