import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    retry: 3,
    passWithNoTests: true,
    maxWorkers: 1,
    slowTestThreshold: 5000,
  },
});
