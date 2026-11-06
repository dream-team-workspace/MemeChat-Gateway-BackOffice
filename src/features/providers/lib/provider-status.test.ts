import { describe, expect, it } from "vitest";

import type { ProviderStatus } from "@shared/admin-api";

import {
  providerCanCheck,
  providerCredentialSummary,
  providerDisplayState,
  providerRouteWarning,
} from "./provider-status";

function status(overrides: Partial<ProviderStatus>): ProviderStatus {
  return {
    id: "openai",
    displayName: "OpenAI",
    role: "Chat",
    endpoint: "https://api.openai.test",
    model: "model",
    modelValid: true,
    credential: "configured",
    configured: true,
    credentialState: "ready",
    enabled: true,
    status: "healthy",
    detail: "",
    latencyMs: null,
    checkedAt: null,
    ...overrides,
  };
}

describe("provider credential states", () => {
  it("renders an unreadable stored key as a credential error", () => {
    const provider = status({ configured: false, hasApiKey: true, credentialState: "unreadable" });
    expect(providerDisplayState(provider)).toMatchObject({
      label: "Credential error",
      variant: "destructive",
    });
    expect(providerCredentialSummary(provider)).toBe("Stored key unusable");
    expect(providerRouteWarning(provider)?.title).toBe("Stored key cannot be used");
    expect(providerCanCheck(provider)).toBe(false);
  });

  it("keeps a missing key distinct from an unreadable one", () => {
    const provider = status({ configured: false, hasApiKey: false, credentialState: "missing" });
    expect(providerDisplayState(provider)).toMatchObject({
      label: "Key missing",
      variant: "warning",
    });
    expect(providerCredentialSummary(provider)).toBe("Key missing");
    expect(providerRouteWarning(provider)?.title).toBe("Provider key is missing");
  });

  it("shows disabled before health and allows probing a ready credential", () => {
    expect(providerDisplayState(status({ enabled: false })).label).toBe("Disabled");
    expect(providerCanCheck(status({}))).toBe(true);
  });
});
