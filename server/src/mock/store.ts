import type {
  AuditEntry,
  Capability,
  CapabilityUpdate,
  CreditGrantInput,
  CreditGrantResult,
  LedgerEntry,
  Model,
  ModelInput,
  ProviderRoute,
  ProvidersUpdate,
  ToggleCapability,
  UsageEvent,
} from "../../../shared/admin-api/index.js";
import { HttpError } from "../lib/errors.js";

type Page<T> = {
  items: T[];
  nextCursor: string | null;
};

const baseTime = Date.now();
const at = (minutesAgo = 0) =>
  new Date(baseTime - minutesAgo * 60_000).toISOString();

const MONTH_AGO = at(60 * 24 * 30);
let nextProviderId = 1;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function provider(
  capabilityId: string,
  priority: number,
  name: string,
  model: string,
  enabled = true,
  config: Record<string, unknown> = {},
): ProviderRoute {
  return {
    id: nextProviderId++,
    capabilityId,
    priority,
    provider: name,
    model,
    enabled,
    config,
  };
}

function capability(input: {
  id: string;
  kind: string;
  displayName: string;
  enabled: boolean;
  streaming: string;
  supportsReasoning: boolean;
  supportsImage: boolean;
  costUnit: string;
  costCredits: number;
  costPer: number;
  limits: Record<string, unknown>;
  fairUse: Record<string, unknown>;
  minAppVersion?: string | null;
  revision: number;
  providers: ProviderRoute[];
  updatedMinutesAgo: number;
}): Capability {
  return {
    id: input.id,
    kind: input.kind,
    displayName: input.displayName,
    enabled: input.enabled,
    streaming: input.streaming,
    supportsReasoning: input.supportsReasoning,
    supportsImage: input.supportsImage,
    costUnit: input.costUnit,
    costCredits: input.costCredits,
    costPer: input.costPer,
    limits: input.limits,
    fairUse: input.fairUse,
    minAppVersion: input.minAppVersion ?? null,
    revision: input.revision,
    providers: input.providers,
    createdAt: MONTH_AGO,
    updatedAt: at(input.updatedMinutesAgo),
  };
}

const capabilities: Capability[] = [
  capability({
    id: "chat.standard",
    kind: "chat",
    displayName: "Standard chat",
    enabled: true,
    streaming: "sse",
    supportsReasoning: false,
    supportsImage: true,
    costUnit: "turn",
    costCredits: 1,
    costPer: 1,
    limits: { maxInputChars: 16000, maxOutputTokens: 1024, maxImageBytes: 1572864 },
    fairUse: { cap: 100, window: "day" },
    minAppVersion: "2.4.0",
    revision: 3,
    updatedMinutesAgo: 2,
    providers: [
      provider("chat.standard", 1, "opencode", "deepseek-v4.1-flash"),
      provider("chat.standard", 2, "openai", "gpt-5-mini"),
    ],
  }),
  capability({
    id: "chat.premium",
    kind: "chat",
    displayName: "Premium chat",
    enabled: true,
    streaming: "sse",
    supportsReasoning: true,
    supportsImage: true,
    costUnit: "turn",
    costCredits: 5,
    costPer: 1,
    limits: { maxInputChars: 16000, maxOutputTokens: 4096, maxImageBytes: 1572864 },
    fairUse: { cap: 50, window: "day" },
    minAppVersion: "2.4.0",
    revision: 5,
    updatedMinutesAgo: 48,
    providers: [
      provider("chat.premium", 1, "opencode", "deepseek-v4.1-flash", true, {
        reasoning: true,
      }),
      provider("chat.premium", 2, "openai", "gpt-5"),
    ],
  }),
  capability({
    id: "tts",
    kind: "tts",
    displayName: "Text to speech",
    enabled: false,
    streaming: "none",
    supportsReasoning: false,
    supportsImage: false,
    costUnit: "chars",
    costCredits: 1,
    costPer: 500,
    limits: { maxChars: 5000 },
    fairUse: {},
    minAppVersion: "2.3.0",
    revision: 2,
    updatedMinutesAgo: 180,
    providers: [provider("tts", 1, "kokoro", "voice-v1")],
  }),
  capability({
    id: "stt",
    kind: "stt",
    displayName: "Speech to text",
    enabled: true,
    streaming: "none",
    supportsReasoning: false,
    supportsImage: false,
    costUnit: "seconds",
    costCredits: 1,
    costPer: 120,
    limits: { maxSeconds: 600 },
    fairUse: {},
    minAppVersion: "2.2.0",
    revision: 1,
    updatedMinutesAgo: 30,
    providers: [provider("stt", 1, "salad", "transcription-lite")],
  }),
  capability({
    id: "embeddings.balanced",
    kind: "embeddings",
    displayName: "Balanced embeddings",
    enabled: true,
    streaming: "none",
    supportsReasoning: false,
    supportsImage: false,
    costUnit: "tokens",
    costCredits: 1,
    costPer: 100000,
    limits: { maxInputs: 1000, maxTokensPerRequest: 320000 },
    fairUse: {},
    minAppVersion: "2.4.0",
    revision: 4,
    updatedMinutesAgo: 60,
    providers: [
      provider("embeddings.balanced", 1, "voyage", "voyage-4", true, {
        documentModel: "voyage-4",
        queryModel: "voyage-4-lite",
        defaultDimensions: 1024,
      }),
      provider("embeddings.balanced", 2, "voyage", "voyage-4-lite"),
    ],
  }),
];

const models: Model[] = [
  {
    id: "deepseek-v4-flash",
    displayName: "DeepSeek V4 Flash",
    tier: "standard",
    capabilityId: "chat.standard",
    sortOrder: 10,
    enabled: true,
    minAppVersion: "2.4.0",
    createdAt: MONTH_AGO,
    updatedAt: at(20),
  },
  {
    id: "gpt-5-mini",
    displayName: "GPT-5 Mini",
    tier: "standard",
    capabilityId: "chat.standard",
    sortOrder: 20,
    enabled: true,
    minAppVersion: "2.4.0",
    createdAt: MONTH_AGO,
    updatedAt: at(90),
  },
  {
    id: "gpt-5",
    displayName: "GPT-5",
    tier: "premium",
    capabilityId: "chat.premium",
    sortOrder: 10,
    enabled: true,
    minAppVersion: "2.4.0",
    createdAt: MONTH_AGO,
    updatedAt: at(120),
  },
  {
    id: "voyage-4",
    displayName: "Voyage 4",
    tier: "balanced",
    capabilityId: "embeddings.balanced",
    sortOrder: 10,
    enabled: true,
    minAppVersion: null,
    createdAt: MONTH_AGO,
    updatedAt: at(240),
  },
];

const audit: AuditEntry[] = [
  {
    id: 3,
    capabilityId: "chat.standard",
    revision: 3,
    action: "updated",
    changedBy: "operator@dream-team.works",
    beforeState: { costCredits: 1, costPer: 1 },
    afterState: { costCredits: 2, costPer: 1 },
    changedAt: at(2),
  },
  {
    id: 2,
    capabilityId: "tts",
    revision: 2,
    action: "disabled",
    changedBy: "operator@dream-team.works",
    beforeState: { enabled: true },
    afterState: { enabled: false },
    changedAt: at(180),
  },
  {
    id: 1,
    capabilityId: "embeddings.balanced",
    revision: 4,
    action: "providers_replaced",
    changedBy: "operator@dream-team.works",
    beforeState: { providers: 1 },
    afterState: { providers: 2 },
    changedAt: at(60),
  },
];

let nextLedgerId = 200;
const ledger: LedgerEntry[] = [
  {
    id: 103,
    uid: "uid_7f3a9c21",
    requestId: "9cde27e0-9a6b-4c9e-bdf4-7f2c1a4f3e21",
    capability: "chat.standard",
    capabilityRevision: 3,
    state: "COMMITTED",
    reserved: 1,
    committed: 1,
    units: 1,
    costUnit: "turn",
    unitAmount: 1,
    rcTxnId: "rc_mock_103",
    balanceAfter: 274,
    spendAttempts: 1,
    refundAttempts: 0,
    refundedAt: null,
    createdAt: at(5),
    updatedAt: at(5),
  },
  {
    id: 102,
    uid: "uid_7f3a9c21",
    requestId: "2f46e8b0-0f0f-4c32-9a9f-5d9c8c7b6a10",
    capability: "chat.premium",
    capabilityRevision: 5,
    state: "REFUNDED",
    reserved: 5,
    committed: 0,
    units: 1,
    costUnit: "turn",
    unitAmount: 5,
    rcTxnId: "rc_mock_102",
    balanceAfter: 275,
    spendAttempts: 1,
    refundAttempts: 1,
    refundedAt: at(120),
    createdAt: at(125),
    updatedAt: at(120),
  },
  {
    id: 101,
    uid: "uid_7f3a9c21",
    requestId: "5f2c6f0e-5f0e-4f5e-8c2a-1b0d3e4f5a6b",
    capability: "chat.standard",
    capabilityRevision: 3,
    state: "PENDING_SPEND",
    reserved: 1,
    committed: null,
    units: 1,
    costUnit: "turn",
    unitAmount: 1,
    rcTxnId: null,
    balanceAfter: 274,
    spendAttempts: 0,
    refundAttempts: 0,
    refundedAt: null,
    createdAt: at(1440),
    updatedAt: at(1439),
  },
];

const usage: UsageEvent[] = [
  {
    id: 303,
    uid: "uid_7f3a9c21",
    requestId: "9cde27e0-9a6b-4c9e-bdf4-7f2c1a4f3e21",
    capability: "chat.standard",
    capabilityRevision: 3,
    provider: "opencode",
    model: "deepseek-v4.1-flash",
    inputTokens: 124,
    outputTokens: 450,
    characters: null,
    audioSeconds: null,
    credits: 1,
    status: "ok",
    latencyMs: 820,
    createdAt: at(5),
  },
  {
    id: 302,
    uid: "uid_7f3a9c21",
    requestId: "2f46e8b0-0f0f-4c32-9a9f-5d9c8c7b6a10",
    capability: "chat.premium",
    capabilityRevision: 5,
    provider: "openai",
    model: "gpt-5",
    inputTokens: 300,
    outputTokens: 0,
    characters: null,
    audioSeconds: null,
    credits: 0,
    status: "upstream_error",
    latencyMs: 4210,
    createdAt: at(125),
  },
  {
    id: 301,
    uid: "uid_7f3a9c21",
    requestId: "5f2c6f0e-5f0e-4f5e-8c2a-1b0d3e4f5a6b",
    capability: "chat.standard",
    capabilityRevision: 3,
    provider: "opencode",
    model: "deepseek-v4.1-flash",
    inputTokens: 80,
    outputTokens: 120,
    characters: null,
    audioSeconds: null,
    credits: 1,
    status: "client_abort",
    latencyMs: 1800,
    createdAt: at(1440),
  },
];

function encodeCursor(offset: number) {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | undefined) {
  if (!cursor) return 0;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      offset?: unknown;
    };
    return typeof value.offset === "number" && Number.isInteger(value.offset) && value.offset >= 0
      ? value.offset
      : 0;
  } catch {
    return 0;
  }
}

function paginate<T>(items: T[], limit: number, cursor?: string): Page<T> {
  const offset = decodeCursor(cursor);
  const slice = items.slice(offset, offset + limit);
  const nextOffset = offset + slice.length;
  return {
    items: slice,
    nextCursor: nextOffset < items.length ? encodeCursor(nextOffset) : null,
  };
}

function auditFor(capabilityId: string) {
  return audit
    .filter((entry) => entry.capabilityId === capabilityId)
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt));
}

export class MockStore {
  listCapabilities(): Capability[] {
    return [...capabilities].sort((a, b) => a.id.localeCompare(b.id));
  }

  getCapability(id: string): Capability {
    const found = capabilities.find((item) => item.id === id);
    if (!found) throw new HttpError(404, "NOT_FOUND", "Capability not found.");
    return found;
  }

  updateCapability(id: string, input: CapabilityUpdate, actor: string): Capability {
    const item = this.getCapability(id);
    const before = clone(item);
    Object.assign(item, input, {
      revision: item.revision + 1,
      updatedAt: at(),
    });
    audit.push({
      id: audit.length + 4,
      capabilityId: id,
      revision: item.revision,
      action: "updated",
      changedBy: actor,
      beforeState: clone(before) as unknown as Record<string, unknown>,
      afterState: clone(item) as unknown as Record<string, unknown>,
      changedAt: at(),
    });
    return item;
  }

  toggleCapability(id: string, input: ToggleCapability, actor: string): Capability {
    const item = this.getCapability(id);
    const before = clone(item);
    item.enabled = input.enabled;
    item.revision += 1;
    item.updatedAt = at();
    audit.push({
      id: audit.length + 4,
      capabilityId: id,
      revision: item.revision,
      action: input.enabled ? "enabled" : "disabled",
      changedBy: actor,
      beforeState: clone(before) as unknown as Record<string, unknown>,
      afterState: { ...clone(item), reason: input.reason } as unknown as Record<string, unknown>,
      changedAt: at(),
    });
    return item;
  }

  replaceProviders(id: string, input: ProvidersUpdate, actor: string): Capability {
    const item = this.getCapability(id);
    const before = clone(item);
    item.providers = input.providers.map((route) => ({
      ...route,
      id: nextProviderId++,
      capabilityId: id,
    }));
    item.revision += 1;
    item.updatedAt = at();
    audit.push({
      id: audit.length + 4,
      capabilityId: id,
      revision: item.revision,
      action: "providers_replaced",
      changedBy: actor,
      beforeState: clone(before) as unknown as Record<string, unknown>,
      afterState: clone(item) as unknown as Record<string, unknown>,
      changedAt: at(),
    });
    return item;
  }

  listAudit(id: string, limit = 50): Page<AuditEntry> {
    this.getCapability(id);
    return paginate(auditFor(id), limit);
  }

  listModels(): Model[] {
    return [...models].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  }

  upsertModel(id: string, input: ModelInput): Model {
    const existing = models.find((item) => item.id === id);
    if (existing) {
      Object.assign(existing, input, { updatedAt: at() });
      return existing;
    }
    const created: Model = {
      id,
      ...input,
      createdAt: at(),
      updatedAt: at(),
    };
    models.push(created);
    return created;
  }

  invalidateCache() {
    return {
      invalidatedAt: at(),
      revision: Math.max(...capabilities.map((item) => item.revision)),
    };
  }

  listLedger(uid: string, limit = 50, cursor?: string): Page<LedgerEntry> {
    const rows = ledger
      .filter((entry) => entry.uid === uid)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(rows, limit, cursor);
  }

  listUsage(uid: string, limit = 50, cursor?: string): Page<UsageEvent> {
    const rows = usage
      .filter((entry) => entry.uid === uid)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(rows, limit, cursor);
  }

  grant(uid: string, input: CreditGrantInput, _actor: string): CreditGrantResult {
    const existing = ledger.find(
      (entry) =>
        entry.uid === uid &&
        entry.requestId === input.requestId &&
        entry.capability === "credits.grant",
    );
    if (existing) {
      return {
        uid,
        amount: existing.committed ?? input.amount,
        requestId: existing.requestId,
        balanceAfter: existing.balanceAfter ?? undefined,
        rcTxnId: existing.rcTxnId ?? undefined,
      };
    }

    const balanceAfter =
      (ledger.find((entry) => entry.uid === uid)?.balanceAfter ?? 0) + input.amount;
    const id = nextLedgerId++;
    const entry: LedgerEntry = {
      id,
      uid,
      requestId: input.requestId,
      capability: "credits.grant",
      capabilityRevision: null,
      state: "COMMITTED",
      reserved: input.amount,
      committed: input.amount,
      units: input.amount,
      costUnit: "credits",
      unitAmount: 1,
      rcTxnId: "rc_mock_" + String(id),
      balanceAfter,
      spendAttempts: 0,
      refundAttempts: 0,
      refundedAt: null,
      createdAt: at(),
      updatedAt: at(),
    };
    ledger.unshift(entry);

    return {
      uid,
      amount: input.amount,
      requestId: input.requestId,
      balanceAfter,
      rcTxnId: entry.rcTxnId ?? undefined,
    };
  }
}

export const mockStore = new MockStore();
