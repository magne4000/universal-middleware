import type { TestOptions } from "vitest";

export const adapters = [
  "hono",
  "express",
  "hattip",
  "webroute",
  "fastify",
  "h3",
  "cloudflare-pages",
  "cloudflare-worker",
  "vercel-edge",
  "vercel-node",
  "elysia",
] as const;

// flaky tests on Windows
export const options: TestOptions = {
  timeout: 30000,
  retry: process.platform === "win32" ? 3 : 0,
};
