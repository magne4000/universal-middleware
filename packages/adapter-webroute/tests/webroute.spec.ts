import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

let port = 3300;

const runs: Run[] = [
  // Waiting for fix https://github.com/sinclairnick/webroute/pull/40
  // {
  //   name: "adapter-webroute: node",
  //   command: "pnpm run test:run-webroute:node",
  //   port: port++,
  // },
  // {
  //   name: "adapter-webroute: bun",
  //   command: "pnpm run test:run-webroute:bun",
  //   port: port++,
  // },
  {
    name: "adapter-webroute: deno",
    command: "pnpm run test:run-webroute:deno",
    port: port++,
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
