import { config } from "../config.js";
import { HttpError } from "../lib/errors.js";
import type { Actor } from "../types.js";

export type AdminRequestInit = {
  method?: string;
  body?: unknown;
  requestId?: string;
};

export async function adminFetch(
  path: string,
  actor: Actor,
  init: AdminRequestInit = {},
): Promise<unknown> {
  if (!config.adminApiSecret) {
    throw new HttpError(
      503,
      "LIVE_NOT_CONFIGURED",
      "ADMIN_API_SECRET is not configured.",
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: "Bearer " + config.adminApiSecret,
    "X-Admin-Actor": actor.email,
    "User-Agent": "memechat-backoffice-bff/" + config.version,
  };
  if (init.requestId) headers["X-Request-Id"] = init.requestId;

  const requestInit: RequestInit = {
    method: init.method ?? "GET",
    headers,
    signal: AbortSignal.timeout(10_000),
  };
  if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestInit.body = JSON.stringify(init.body);
  }

  let response: Response;
  try {
    response = await fetch(config.adminApiBaseUrl + path, requestInit);
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new HttpError(504, "TIMEOUT", "The gateway admin API timed out.");
    }
    throw new HttpError(502, "UPSTREAM_ERROR", "The gateway admin API is unreachable.");
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      // A successful response must be JSON. An error from an unknown route may
      // be plain text, so preserve its status for the browser to interpret.
      if (response.ok) {
        throw new HttpError(
          502,
          "CONTRACT_MISMATCH",
          "The gateway returned a non-JSON response.",
        );
      }
    }
  }

  if (!response.ok) {
    const record =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const code = typeof record.code === "string" ? record.code : "UPSTREAM_ERROR";
    const fallbackMessage = text.trim().slice(0, 200);
    const message =
      typeof record.message === "string"
        ? record.message
        : fallbackMessage || "The gateway admin API returned an error.";
    throw new HttpError(response.status, code, message);
  }

  return body;
}
