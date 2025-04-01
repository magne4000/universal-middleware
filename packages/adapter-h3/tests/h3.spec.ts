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
    ...expectInternalServerError,
  },
  {
    name: "adapter-h3: node router",
    command: "pnpm run test:run-h3:node",
    port: port++,
    env: {
      TEST_CASE: "router",
    },
    ...expectInternalServerError,
  },
  {
    name: "adapter-h3: node router enhanced",
    command: "pnpm run test:run-h3:node",
    port: port++,
    env: {
      TEST_CASE: "router_enhanced",
    },
    ...expectInternalServerError,
  },
  {
    name: "adapter-h3: bun",
    command: "pnpm run test:run-h3:bun",
    port: port++,
    ...expectInternalServerError,
  },
  {
    name: "adapter-h3: deno",
    command: "pnpm run test:run-h3:deno",
    port: port++,
    ...expectInternalServerError,
  },
];

runTests(runs, {
  vitest,
});
