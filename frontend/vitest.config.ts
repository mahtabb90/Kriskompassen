import { configDefaults, defineConfig } from "vitest/config"

// Service tests do not need the application's PWA or styling plugins.
export default defineConfig({
  envDir: false,
  test: {
    environment: "node",
    // Playwright owns e2e/; its *.spec.ts files would otherwise match Vitest's default pattern.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
})
