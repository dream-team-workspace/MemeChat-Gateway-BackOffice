import { describe, expect, it } from "vitest";

import { ApiError } from "@/platform/api";

import { providerErrorHint, providerInUseClients } from "./provider-errors";

describe("provider error interpretation", () => {
  it("parses enriched in-use references and ignores malformed details", () => {
    const error = new ApiError(409, "PROVIDER_IN_USE", "provider is referenced", undefined, {
      appClients: [
        {
          appClientId: "client-1",
          appClientName: "MemeChat",
          appClientSlug: "memechat",
          ability: "llm",
          modelId: "deepseek",
        },
      ],
    });
    expect(providerInUseClients(error)).toHaveLength(1);
    expect(providerInUseClients(new ApiError(409, "PROVIDER_IN_USE", "x"))).toEqual([]);
  });

  it("distinguishes the three 503 remedies", () => {
    expect(providerErrorHint(new ApiError(503, "SECRET_KEY_NOT_CONFIGURED", "x"))).toContain(
      "PROVIDER_SECRET_KEY",
    );
    expect(providerErrorHint(new ApiError(503, "CREDENTIAL_MISSING", "x"))).toContain(
      "no stored key",
    );
    expect(providerErrorHint(new ApiError(503, "NOT_CONFIGURED", "x"))).toContain(
      "provider store",
    );
    expect(providerErrorHint(new ApiError(422, "VALIDATION_FAILED", "x"))).toBeNull();
  });
});
