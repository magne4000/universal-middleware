import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

let port = 3400;

const runs: Run[] = [
  {
    name: "adapter-fastify: node",
    command: "pnpm run test:run-fastify:node",
    port: port++,
  },
  {
    name: "adapter-fastify: node router",
    command: "pnpm run test:run-fastify:node",
    port: port++,
    env: {
      TEST_CASE: "router",
    },
  },
  {
    name: "adapter-fastify: node router enhanced",
    command: "pnpm run test:run-fastify:node",
    port: port++,
    env: {
      TEST_CASE: "router_enhanced",
    },
  },
  {
    name: "adapter-fastify: bun",
    command: "pnpm run test:run-fastify:bun",
    port: port++,
    // https://github.com/oven-sh/bun/issues/14697
    streamCancel: "fail",
  },
  // Fastify is NOT deno compatible
];

runTests(runs, {
  vitest,
  test(response) {
    // added by helmet
    vitest.expect(response.headers.has("content-security-policy")).toBe(true);
    vitest.expect(response.headers.has("x-xss-protection")).toBe(true);
  },
  testPost: true,
});
