import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

let port = 3100;

const runs: Run[] = [
  {
    name: "adapter-express: node simple",
    command: "pnpm run test:run-express:node",
    port: port++,
  },
  {
    name: "adapter-express: node router",
    command: "pnpm run test:run-express:node",
    port: port++,
    env: {
      TEST_CASE: "router",
    },
  },
  {
    name: "adapter-express: node router enhanced",
    command: "pnpm run test:run-express:node",
    port: port++,
    env: {
      TEST_CASE: "router_enhanced",
    },
  },
  {
    name: "adapter-express: bun",
    command: "pnpm run test:run-express:bun",
    port: port++,
  },
  {
    name: "adapter-express: deno",
    command: "pnpm run test:run-express:deno",
    port: port++,
  },
  {
    name: "adapter-express: node simple express@4",
    command: "pnpm run test:run-express:node",
    port: port++,
    env: {
      EXPRESS_V4: "1",
    },
  },
  {
    name: "adapter-express: node router",
    command: "pnpm run test:run-express:node",
    port: port++,
    env: {
      TEST_CASE: "router",
      EXPRESS_V4: "1",
    },
  },
  {
    name: "adapter-express: node router enhanced",
    command: "pnpm run test:run-express:node",
    port: port++,
    env: {
      TEST_CASE: "router_enhanced",
      EXPRESS_V4: "1",
    },
  },
];

runTests(runs, {
  vitest,
  test(response) {
    // added by helmet
    vitest.expect(response.headers.has("content-security-policy")).toBe(true);
    vitest.expect(response.headers.has("x-xss-protection")).toBe(true);
  },
  concurrent: !process.env.CI,
});
