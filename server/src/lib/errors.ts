import type { Context } from "hono";
import { ZodError } from "zod";

import type { ApiErrorBody } from "../../../shared/admin-api/common.js";

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function detailsFromZod(error: ZodError): Record<string, unknown> {
  return {
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}

export function errorHandler(error: Error, c: Context) {
  const requestId = c.get("requestId") as string | undefined;

  if (error instanceof HttpError) {
    return c.json(
      {
        code: error.code,
        message: error.message,
        requestId,
        details: error.details,
      } satisfies ApiErrorBody,
      { status: error.status as 400 },
    );
  }

  if (error instanceof ZodError) {
    return c.json(
      {
        code: "VALIDATION_FAILED",
        message: "The request payload is invalid.",
        requestId,
        details: detailsFromZod(error),
      } satisfies ApiErrorBody,
      { status: 422 },
    );
  }

  console.error(
    JSON.stringify({
      level: "error",
      requestId,
      message: error.message,
      stack: error.stack,
    }),
  );

  return c.json(
    {
      code: "INTERNAL",
      message: "Unexpected server error.",
      requestId,
    } satisfies ApiErrorBody,
    { status: 500 },
  );
}
