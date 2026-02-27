import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

let port = 3500;

const expectInternalServerError = {
  tests: {
    throwLate: {
      expectedBody: '"statusCode": 500',
    },
    throwEarlyAndLate: {
      expectedBody: '"statusCode": 500',
    },
    throwEarly: {
      expectedBody: '"statusCode": 500',
    },
  },
} satisfies Pick<Run, "tests">;

const runs: Run[] = [
  {
    name: "adapter-h3: node",
    command: "pnpm run test:run-h3:node",
    port: port++,
    streamCancel: "skip",
    ...expectInternalServerError,
  },
  {
    name: "adapter-h3: node router",
    command: "pnpm run test:run-h3:node",
    port: port++,
    env: {
      TEST_CASE: "router",
    },
    streamCancel: "skip",
    ...expectInternalServerError,
  },
  {
    name: "adapter-h3: node router enhanced",
    command: "pnpm run test:run-h3:node",
    port: port++,
    env: {
      TEST_CASE: "router_enhanced",
    },
    streamCancel: "skip",
    ...expectInternalServerError,
  },
  {
    name: "adapter-h3: bun",
    command: "pnpm run test:run-h3:bun",
    port: port++,
    streamCancel: "skip",
    ...expectInternalServerError,
  },
  {
    name: "adapter-h3: deno",
    command: "pnpm run test:run-h3:deno",
    port: port++,
    streamCancel: "skip",
    ...expectInternalServerError,
  },
];

runTests(runs, {
  vitest,
});
