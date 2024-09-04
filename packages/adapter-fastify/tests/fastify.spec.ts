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
    name: "adapter-fastify: bun",
    command: "pnpm run test:run-fastify:bun",
    port: port++,
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
