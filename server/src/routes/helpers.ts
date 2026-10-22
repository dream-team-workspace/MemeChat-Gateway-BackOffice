import type { Context } from "hono";
import { z } from "zod";

import { pageQuerySchema, type Page } from "../../../shared/admin-api/common.js";
import { HttpError } from "../lib/errors.js";

export async function jsonBody<T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HttpError(400, "INVALID_REQUEST", "Request body must be valid JSON.");
  }
  return schema.parse(body);
}

export function readPageQuery(c: Context) {
  return pageQuerySchema.parse({
    limit: c.req.query("limit") || undefined,
    cursor: c.req.query("cursor") || undefined,
  });
}

export function readUid(c: Context) {
  const uid = c.req.param("uid") ?? "";
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) {
    throw new HttpError(400, "INVALID_REQUEST", "Invalid UID.");
  }
  return uid;
}

export function normalizePage<T extends z.ZodTypeAny>(
  value: unknown,
  itemSchema: T,
): Page<z.infer<T>> {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const items = Array.isArray(record.items)
    ? record.items
    : Array.isArray(value)
      ? value
      : [];
  const nextCursor =
    typeof record.nextCursor === "string" ? record.nextCursor : null;
  return {
    items: items.map((item) => itemSchema.parse(item)) as z.infer<T>[],
    nextCursor,
  };
}
