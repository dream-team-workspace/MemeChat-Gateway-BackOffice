import { describe, expect, it } from "vitest";

import { routeInputsForMetadataEdit } from "./app-client-routes";

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "App",
  slug: "app",
  platform: "android" as const,
  description: "",
  enabled: true,
  requireFirebaseUid: false,
  capabilities: [],
  keyRotatedAt: null,
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
};

describe("metadata route preservation", () => {
  it("returns undefined for a legacy client without routes", () => {
    expect(routeInputsForMetadataEdit({ ...base })).toBeUndefined();
  });

  it("keeps only complete enabled routes", () => {
    const input = routeInputsForMetadataEdit({
      ...base,
      routes: [
        {
          ability: "llm",
          abilityName: "Language model",
          providerId: "opencode",
          providerName: "OpenCode",
          modelId: "deepseek-v4.1-flash",
          modelName: "DeepSeek V4.1 Flash",
          enabled: true,
        },
        {
          ability: "tts",
          abilityName: "Text to speech",
          providerId: null,
          providerName: null,
          modelId: null,
          modelName: null,
          enabled: false,
        },
      ],
    });
    expect(input).toEqual([
      {
        ability: "llm",
        providerId: "opencode",
        modelId: "deepseek-v4.1-flash",
        enabled: true,
      },
    ]);
  });
});
