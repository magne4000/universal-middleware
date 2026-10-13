import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

let port = 3500;

const h3Expectations = {
  waitUntilType: "function",
  tests: {
    throwLate: {
      expectedBody: '"status":500',
    },
    throwEarlyAndLate: {
      expectedBody: '"status":500',
    },
    throwEarly: {
      expectedBody: '"status":500',
    },
  },
} satisfies Pick<Run, "tests" | "waitUntilType">;

const runs: Run[] = [
  {
    name: "adapter-h3: node",
    command: "pnpm run test:run-h3:node",
    port: port++,
    ...h3Expectations,
  },
  {
    name: "adapter-h3: node router",
    command: "pnpm run test:run-h3:node",
    port: port++,
    env: {
      TEST_CASE: "router",
    },
    ...h3Expectations,
  },
  {
    name: "adapter-h3: node router enhanced",
    command: "pnpm run test:run-h3:node",
    port: port++,
    env: {
      TEST_CASE: "router_enhanced",
    },
    ...h3Expectations,
  },
  {
    name: "adapter-h3: bun",
    command: "pnpm run test:run-h3:bun",
    port: port++,
    ...h3Expectations,
  },
  {
    name: "adapter-h3: deno",
    command: "pnpm run test:run-h3:deno",
    port: port++,
    ...h3Expectations,
  },
];

runTests(runs, {
  vitest,
});
