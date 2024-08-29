import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

let port = 3000;

const runs: Run[] = [
  {
    name: "adapter-hono: node",
    command: "pnpm run test:run-hono:node",
    port: port++,
  },
  {
    name: "adapter-hono: bun",
    command: "pnpm run test:run-hono:bun",
    port: port++,
  },
  {
    name: "adapter-hono: deno",
    command: "pnpm run test:run-hono:deno",
    port: port++,
  },
  {
    name: "adapter-hono: wrangler",
    command: "pnpm run test:run-hono:wrangler",
    port: port++,
    waitUntilType: "function",
  },
];

runTests(runs, {
  vitest,
  test(response, body, run) {
    if (run.name !== "adapter-hono: wrangler") {
      // added by hono/secure-headers
      vitest
        .expect(response.headers.has("cross-origin-opener-policy"))
        .toBe(true);
      vitest.expect(response.headers.has("x-xss-protection")).toBe(true);
    }
  },
});
