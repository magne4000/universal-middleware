import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

let port = 3500;

const runs: Run[] = [
  {
    name: "adapter-h3: node",
    command: "pnpm run test:run-h3:node",
    port: port++,
  },
  {
    name: "adapter-h3: node router",
    command: "pnpm run test:run-h3:node",
    port: port++,
    env: {
      TEST_CASE: "router",
    },
  },
  {
    name: "adapter-h3: node router enhanced",
    command: "pnpm run test:run-h3:node",
    port: port++,
    env: {
      TEST_CASE: "router_enhanced",
    },
  },
  {
    name: "adapter-h3: bun",
    command: "pnpm run test:run-h3:bun",
    port: port++,
  },
  {
    name: "adapter-h3: deno",
    command: "pnpm run test:run-h3:deno",
    port: port++,
  },
];

runTests(runs, {
  vitest,
});
