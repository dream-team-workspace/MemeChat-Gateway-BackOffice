import { describe, expect, it } from "vitest";

import { ApiError } from "@/platform/api";

import { routeErrorAbility } from "./route-errors";
import { toRouteDraft } from "@/features/app-clients/hooks/use-route-draft";

const draft = toRouteDraft([
  {
    ability: "llm",
    abilityName: "Language model",
    providerId: "opencode",
    providerName: "OpenCode",
    modelId: "deepseek",
    modelName: "DeepSeek",
    enabled: true,
  },
  {
    ability: "tts",
    abilityName: "Text to speech",
    providerId: "elevenlabs",
    providerName: "ElevenLabs",
    modelId: "turbo",
    modelName: "Turbo",
    enabled: true,
  },
]);

describe("route error mapping", () => {
  it("maps a validation issue path to the fixed ability row", () => {
    const error = new ApiError(422, "VALIDATION_FAILED", "invalid route", undefined, {
      issues: [{ path: "routes.1.model_id", message: "model belongs to another ability" }],
    });
    expect(routeErrorAbility(error, draft)).toBe("tts");
  });

  it("falls back to the ability named in the message", () => {
    const error = new ApiError(422, "VALIDATION_FAILED", "model belongs to ability tts");
    expect(routeErrorAbility(error, draft)).toBe("tts");
  });

  it("ignores non-validation and unmatched errors", () => {
    expect(routeErrorAbility(new ApiError(409, "CONFLICT", "conflict"), draft)).toBeNull();
  });
});
