import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3600;

const runs: Run[] = [
  {
    name: "adapter-cloudflare: pages",
    port: port,
    command: `pnpm run test:run-cloudflare:pages --inspector-port ${port + 10000}`,
    waitUntilType: "function",
    delay: 1000,
  },
  {
    name: "adapter-cloudflare: worker",
    port: port + 1,
    command: `pnpm run test:run-cloudflare:worker --inspector-port ${port + 10000 + 1}`,
    waitUntilType: "function",
    delay: 1000,
  },
];

runTests(runs, {
  vitest,
});
