import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3900;

const expectInternalServerError = {
  tests: {
    throwLate: {
      expectedBody: "Internal Server Error",
    },
    throwEarlyAndLate: {
      expectedBody: "Internal Server Error",
    },
    throwEarly: {
      expectedBody: "Internal Server Error",
    },
  },
} satisfies Pick<Run, "tests">;

const runs: Run[] = [
  {
    name: "adapter-srvx: node",
    command: "pnpm run test:run-srvx:node",
    port: port,
    waitUntilType: "function",
    staticContext: true,
    ...expectInternalServerError,
  },
  {
    name: "adapter-srvx: node router",
    command: "pnpm run test:run-srvx:node",
    port: port + 1,
    waitUntilType: "function",
    staticContext: true,
    env: {
      TEST_CASE: "router",
    },
    ...expectInternalServerError,
  },
  {
    name: "adapter-srvx: node router enhanced",
    command: "pnpm run test:run-srvx:node",
    port: port + 2,
    waitUntilType: "function",
    staticContext: true,
    env: {
      TEST_CASE: "router_enhanced",
    },
    ...expectInternalServerError,
  },
  {
    name: "adapter-srvx: bun",
    command: "pnpm run test:run-srvx:bun",
    port: port + 3,
    waitUntilType: "function",
    staticContext: true,
    ...expectInternalServerError,
  },
  {
    name: "adapter-srvx: deno",
    command: "pnpm run test:run-srvx:deno",
    port: port + 4,
    waitUntilType: "function",
    staticContext: true,
    ...expectInternalServerError,
  },
  // TODO replace this with cloudflare worker
  // {
  //   name: "adapter-srvx: wrangler",
  //   command: `pnpm run test:run-srvx:wrangler --inspector-port ${port + 10000 + 5}`,
  //   port: port + 5,
  //   waitUntilType: "function",
  //   delay: 1000,
  // },
];

runTests(runs, {
  vitest,
});
