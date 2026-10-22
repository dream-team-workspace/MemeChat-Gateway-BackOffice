import { z } from "zod";

import { apiErrorSchema } from "@shared/admin-api";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    requestId?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unexpected error.";
}

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("X-Request-Id", crypto.randomUUID());
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
  });

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError(
        response.status,
        "CONTRACT_MISMATCH",
        "The server returned a non-JSON response.",
      );
    }
  }

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new ApiError(
      response.status,
      parsed.success ? parsed.data.code : "UNKNOWN",
      parsed.success ? parsed.data.message : "The request failed.",
      parsed.success ? parsed.data.requestId : undefined,
      parsed.success ? parsed.data.details : undefined,
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      response.status,
      "CONTRACT_MISMATCH",
      "The server response did not match the expected contract.",
      undefined,
      { issues: parsed.error.issues.map((issue) => issue.message) },
    );
  }
  return parsed.data;
}
