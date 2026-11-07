import { describe, expect, it } from "vitest";

import { capabilitySchema } from "./capabilities.js";

const capability = {
  id: "vector",
  kind: "vector",
  displayName: "Vector storage",
  enabled: true,
  streaming: "none",
  supportsReasoning: false,
  supportsImage: false,
  costUnit: "request",
  costCredits: 1,
  costPer: 1,
  limits: {},
  fairUse: {},
  minAppVersion: null,
  revision: 1,
  providers: null,
  createdAt: "2026-11-07T00:00:00Z",
  updatedAt: "2026-11-07T00:00:00Z",
};

describe("capability contract", () => {
  it("normalizes a null legacy provider chain to an empty array", () => {
    const parsed = capabilitySchema.parse(capability);
    expect(parsed.providers).toEqual([]);
  });
});
