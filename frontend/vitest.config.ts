import { defineConfig } from "vitest/config"

// Service tests do not need the application's PWA or styling plugins.
export default defineConfig({
  envDir: false,
  define: { __APP_BUILD_ID__: JSON.stringify("testversion") },
  test: {
    environment: "node",
  },
})
