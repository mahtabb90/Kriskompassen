import { defineConfig } from "vitest/config"

// Service tests do not need the application's PWA or styling plugins.
export default defineConfig({
  envDir: false,
  test: {
    environment: "node",
  },
})
