import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3700;

const runs: Run[] = [
  // {
  //   name: "adapter-elysia: node",
  //   command: "pnpm run test:run-elysia:node",
  //   port: port,
  // },
  {
    name: "adapter-elysia: bun",
    command: "pnpm run test:run-elysia:bun",
    port: port + 1,
  },
  // {
  //   name: "adapter-elysia: deno",
  //   command: "pnpm run test:run-elysia:deno",
  //   port: port + 2,
  // },
  // {
  //   name: "adapter-elysia: wrangler",
  //   command: `pnpm run test:run-elysia:wrangler --inspector-port ${port + 10000 + 3}`,
  //   port: port + 3,
  //   waitUntilType: "function",
  //   delay: 1000,
  // },
];

runTests(runs, {
  vitest,
});
