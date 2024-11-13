import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3850;

const runs: Run[] = [
  {
    name: "adapter-vercel: node",
    command: "pnpm run test:run-vercel:node",
    port,
  },
];

runTests(runs, {
  vitest,
  prefix: "/api/web",
});
