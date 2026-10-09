import { spawnSync } from "node:child_process";
import { defineConfig } from "vitest/config";

// `vercel dev` needs `VERCEL_TOKEN` or a `vercel login` session: without one, every test fails without testing anything
const hasCredentials =
  Boolean(process.env.VERCEL_TOKEN) ||
  spawnSync("vercel", ["whoami"], { stdio: "ignore", shell: process.platform === "win32" }).status === 0;

if (!hasCredentials) {
  console.warn("Skipping the Vercel tests: set VERCEL_TOKEN or run `vercel login` to run them.");
}

export default defineConfig({
  test: {
    passWithNoTests: true,
    maxWorkers: 1,
    slowTestThreshold: 5000,
    ...(hasCredentials ? {} : { include: [] }),
  },
});
