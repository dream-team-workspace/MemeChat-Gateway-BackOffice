const PRESERVE_KEYS = new Set([
  "limits",
  "fair_use",
  "fairUse",
  "config",
  "before_state",
  "beforeState",
  "after_state",
  "afterState",
]);

function snakeToCamel(key: string) {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function camelToSnake(key: string) {
  return key.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase());
}

function mapKeys(value: unknown, convert: (key: string) => string): unknown {
  if (Array.isArray(value)) return value.map((item) => mapKeys(item, convert));
  if (!value || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(source)) {
    const mappedKey = convert(key);
    result[mappedKey] = PRESERVE_KEYS.has(key) ? child : mapKeys(child, convert);
  }
  return result;
}

/** Normalize documented gateway snake_case responses to the canonical contract. */
export function camelize(value: unknown): unknown {
  return mapKeys(value, snakeToCamel);
}

/** Convert canonical camelCase mutation bodies to the gateway's snake_case fields. */
export function toApiBody(value: unknown): unknown {
  return mapKeys(value, camelToSnake);
}

export function listItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["items", "data", "capabilities", "models", "ledger", "usage", "audit"]) {
      if (Array.isArray(record[key])) return record[key] as unknown[];
    }
  }
  return [];
}
