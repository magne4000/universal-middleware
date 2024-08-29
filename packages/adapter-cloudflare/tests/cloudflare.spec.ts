import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

let port = 3600;

const runs: Run[] = [
  {
    name: "adapter-cloudflare: pages",
    command: `pnpm run test:run-cloudflare:pages --inspector-port ${port++ + 10000}`,
    port: port,
    waitUntilType: "function",
  },
  {
    name: "adapter-cloudflare: worker",
    command: `pnpm run test:run-cloudflare:worker --inspector-port ${port++ + 10000}`,
    port: port,
    waitUntilType: "function",
  },
];

runTests(runs, {
  vitest,
});
