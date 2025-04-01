import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3050;

const expectInternalServerError = {
  tests: {
    throwLate: {
      expectedBody: "Internal Server Error",
    },
  },
};

const runs: Run[] = [
  {
    name: "adapter-hono: node",
    command: "pnpm run test:run-hono:node",
    port: port,
    ...expectInternalServerError,
  },
  {
    name: "adapter-hono: node router",
    command: "pnpm run test:run-hono:node",
    port: port + 1,
    env: {
      TEST_CASE: "router",
    },
    ...expectInternalServerError,
  },
  {
    name: "adapter-hono: node router enhanced",
    command: "pnpm run test:run-hono:node",
    port: port + 2,
    env: {
      TEST_CASE: "router_enhanced",
    },
    ...expectInternalServerError,
  },
  {
    name: "adapter-hono: bun",
    command: "pnpm run test:run-hono:bun",
    port: port + 3,
    ...expectInternalServerError,
  },
  {
    name: "adapter-hono: deno",
    command: "pnpm run test:run-hono:deno",
    port: port + 4,
    ...expectInternalServerError,
  },
  {
    name: "adapter-hono: wrangler",
    command: `pnpm run test:run-hono:wrangler --inspector-port ${port + 10000 + 5}`,
    port: port + 5,
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
