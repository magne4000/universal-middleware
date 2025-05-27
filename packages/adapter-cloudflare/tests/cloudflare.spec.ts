import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3600;
const delay = process.env.CI ? 3000 : 1000;

const runs: Run[] = [
  {
    name: "adapter-cloudflare: pages",
    port: port,
    command: `pnpm run test:run-cloudflare:pages --inspector-port ${port + 10000}`,
    waitUntilType: "function",
    delay,
  },
  {
    name: "adapter-cloudflare: worker",
    port: port + 1,
    command: `pnpm run test:run-cloudflare:worker --define TEST_CASE:'"simple"' --inspector-port ${port + 10000 + 1}`,
    waitUntilType: "function",
    delay,
  },
  {
    name: "adapter-cloudflare: worker router",
    port: port + 2,
    command: `pnpm run test:run-cloudflare:worker --define TEST_CASE:'"router"' --inspector-port ${port + 10000 + 2}`,
    waitUntilType: "function",
    delay,
  },
  {
    name: "adapter-cloudflare: worker router enhanced",
    port: port + 3,
    command: `pnpm run test:run-cloudflare:worker --define TEST_CASE:'"router_enhanced"' --inspector-port ${port + 10000 + 3}`,
    waitUntilType: "function",
    delay,
  },
];

runTests(runs, {
  vitest,
  retry: 3,
  concurrent: !process.env.CI,
});
