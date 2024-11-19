import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3800;

const token = process.env.VERCEL_TOKEN ? ` --token=${process.env.VERCEL_TOKEN}` : "";

const runs: Run[] = [
  {
    name: "adapter-vercel: node",
    command: `pnpm run test:run-vercel:node${token}`,
    port,
  },
];

runTests(runs, {
  vitest,
  prefix: "/api/node",
});
