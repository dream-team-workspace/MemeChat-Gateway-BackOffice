import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "shared/**/*.test.ts"],
    restoreMocks: true,
    env: {
      NODE_ENV: "test",
      APP_ENV: "development",
      ADMIN_API_BASE_URL: "http://gateway.test",
      ADMIN_API_SECRET: "test-secret",
      DEV_ACTOR_EMAIL: "operator@test.local",
    },
  },
});
