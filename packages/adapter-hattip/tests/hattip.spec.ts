import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3200;

const runs: Run[] = [
  {
    name: "adapter-hattip: node",
    command: "pnpm run test:run-hattip:node",
    port: port,
  },
  {
    name: "adapter-hattip: node router",
    command: "pnpm run test:run-hattip:node",
    port: port + 1,
    env: {
      TEST_CASE: "router",
    },
  },
  {
    name: "adapter-hattip: node router enhanced",
    command: "pnpm run test:run-hattip:node",
    port: port + 2,
    env: {
      TEST_CASE: "router_enhanced",
    },
  },
  {
    name: "adapter-hattip: bun",
    command: "pnpm run test:run-hattip:bun",
    port: port + 3,
  },
  {
    name: "adapter-hattip: deno",
    command: "pnpm run test:run-hattip:deno",
    port: port + 4,
  },
  {
    name: "adapter-hattip: cloudflare worker",
    command: `pnpm run test:run-hattip:worker --inspector-port ${port + 10000 + 5}`,
    port: port + 5,
    waitUntilType: "function",
    delay: 1000,
  },
];

runTests(runs, {
  vitest,
  test(response) {
    // added by @hattip/cors
    vitest.expect(response.headers.get("vary")).toContain("Origin");
  },
});
