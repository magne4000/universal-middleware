import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3700;

const runs: Run[] = [
  {
    name: "adapter-elysia: bun",
    command: "pnpm run test:run-elysia:bun",
    port: port,
  },
  {
    name: "adapter-elysia: worker",
    command: `pnpm run test:run-elysia:worker --inspector-port ${port + 10000 + 1}`,
    port: port + 1,
    waitUntilType: "function",
    delay: 1000,
  },
];

runTests(runs, {
  vitest,
});
