import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: [
      "apps/**/*.{test,spec}.ts",
      "apps/**/*.{test,spec}.tsx",
      "packages/**/*.{test,spec}.ts",
      "packages/**/*.{test,spec}.tsx"
    ]
  }
});
