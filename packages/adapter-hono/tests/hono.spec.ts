import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3050;

const runs: Run[] = [
  {
    name: "adapter-hono: node",
    command: "pnpm run test:run-hono:node",
    port: port,
  },
  {
    name: "adapter-hono: bun",
    command: "pnpm run test:run-hono:bun",
    port: port + 1,
  },
  {
    name: "adapter-hono: deno",
    command: "pnpm run test:run-hono:deno",
    port: port + 2,
  },
  {
    name: "adapter-hono: wrangler",
    command: `pnpm run test:run-hono:wrangler --inspector-port ${port + 10000 + 3}`,
    port: port + 3,
    waitUntilType: "function",
    delay: 1000,
  },
];

runTests(runs, {
  vitest,
  test(response, body, run) {
    if (run.name !== "adapter-hono: wrangler") {
      // added by hono/secure-headers
      vitest.expect(response.headers.has("cross-origin-opener-policy")).toBe(true);
      vitest.expect(response.headers.has("x-xss-protection")).toBe(true);
    }
  },
});
