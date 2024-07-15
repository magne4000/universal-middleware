import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

let port = 3000;

const runs: Run[] = [
  {
    name: "adapter-hattip: node",
    command: "pnpm run test:run-hattip:node",
    port: port++,
  },
  {
    name: "adapter-hattip: bun",
    command: "pnpm run test:run-hattip:bun",
    port: port++,
  },
  {
    name: "adapter-hattip: deno",
    command: "pnpm run test:run-hattip:deno",
    port: port++,
  },
];

runTests(runs, {
  vitest,
  test(response) {
    // added by @hattip/cors
    vitest.expect(response.headers.get("vary")).toContain("Origin");
  },
});
