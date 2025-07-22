/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    retry: 3,
    passWithNoTests: true,
    poolOptions: {
      forks: {
        // vercel cli allocates too much memory to have them run in parallel
        singleFork: true,
      },
    },
  },
});
