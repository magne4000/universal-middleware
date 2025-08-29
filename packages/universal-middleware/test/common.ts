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
  "srvx",
] as const;

export const noMiddlewaresSupport = ["cloudflare-worker", "vercel-edge", "vercel-node"];

// flaky tests on Windows
export const options: TestOptions = {
  timeout: 60000,
  retry: process.platform === "win32" ? 3 : 0,
};

export function expectNbOutput(nbHandlers = 0, nbMiddlewares = 0) {
  return nbHandlers * (adapters.length + 1) + nbMiddlewares * (adapters.length + 1 - noMiddlewaresSupport.length);
}
