import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3300;

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
    name: "adapter-webroute: node",
    command: "pnpm run test:run-webroute:node",
    port: port,
    ...expectInternalServerError,
  },
  {
    name: "adapter-webroute: bun",
    command: "pnpm run test:run-webroute:bun",
    port: port + 1,
    ...expectInternalServerError,
  },
  {
    name: "adapter-webroute: deno",
    command: "pnpm run test:run-webroute:deno",
    port: port + 2,
    ...expectInternalServerError,
  },
];

runTests(runs, {
  vitest,
  test(response) {
    // added by hono/secure-headers
    vitest.expect(response.headers.has("cross-origin-opener-policy")).toBe(true);
    vitest.expect(response.headers.has("x-xss-protection")).toBe(true);
  },
});
