import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

let port = 3600;

const runs: Run[] = [
  {
    name: "adapter-cloudflare: wrangler",
    command: "pnpm run test:run-cloudflare:wrangler",
    port: port++,
    waitUntilType: "function",
  },
];

runTests(runs, {
  vitest,
});
