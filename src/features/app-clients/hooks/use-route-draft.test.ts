import { describe, expect, it } from "vitest";

import {
  firstIncomplete,
  routeInputs,
  routesEqual,
  toRouteDraft,
} from "./use-route-draft";

const route = (ability: string, providerId: string | null, modelId: string | null) => ({
  ability,
  abilityName: ability,
  providerId,
  providerName: providerId,
  modelId,
  modelName: modelId,
  enabled: true,
});

describe("route draft", () => {
  it("keeps the five abilities in fixed order and ignores unrouted rows", () => {
    const draft = toRouteDraft([
      route("tts", "elevenlabs", "eleven_turbo_v2_5"),
      route("llm", "opencode", "deepseek-v4.1-flash"),
      route("stt", null, null),
    ]);
    expect(draft.map((row) => row.ability)).toEqual([
      "llm",
      "tts",
      "stt",
      "embeddings",
      "vector",
    ]);
    expect(draft[0]).toMatchObject({ providerId: "opencode", modelId: "deepseek-v4.1-flash" });
    expect(draft[2]).toMatchObject({ providerId: "", modelId: "" });
  });

  it("sends only complete routes", () => {
    const draft = toRouteDraft([route("llm", "opencode", "deepseek-v4.1-flash")]);
    draft[1] = { ability: "tts", providerId: "elevenlabs", modelId: "" };
    expect(routeInputs(draft)).toEqual([
      {
        ability: "llm",
        providerId: "opencode",
        modelId: "deepseek-v4.1-flash",
        enabled: true,
      },
    ]);
    expect(firstIncomplete(draft)?.ability).toBe("tts");
  });

  it("compares provider and model tuples, not object identity", () => {
    const left = toRouteDraft([route("llm", "opencode", "deepseek-v4.1-flash")]);
    const right = toRouteDraft([route("llm", "opencode", "deepseek-v4.1-flash")]);
    expect(routesEqual(left, right)).toBe(true);
    right[0] = { ability: "llm", providerId: "opencode", modelId: "deepseek-v4-pro" };
    expect(routesEqual(left, right)).toBe(false);
  });
});
