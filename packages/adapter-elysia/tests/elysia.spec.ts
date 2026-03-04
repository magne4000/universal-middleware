import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3700;

const runs: Run[] = [
  {
    name: "adapter-elysia: bun",
    command: "pnpm run test:run-elysia:bun",
    port: port,
    streamCancel: "fail",
  },
  {
    name: "adapter-elysia: bun router",
    command: "pnpm run test:run-elysia:bun",
    port: port + 1,
    env: {
      TEST_CASE: "router",
    },
    streamCancel: "fail",
  },
  {
    name: "adapter-elysia: bun router enhanced",
    command: "pnpm run test:run-elysia:bun",
    port: port + 2,
    env: {
      TEST_CASE: "router_enhanced",
    },
    streamCancel: "fail",
  },
  {
    name: "adapter-elysia: worker",
    command: `pnpm run test:run-elysia:worker --inspector-port ${port + 10000 + 3}`,
    port: port + 3,
    waitUntilType: "function",
    delay: 1000,
    streamCancel: "skip",
  },
];

runTests(runs, {
  vitest,
});
