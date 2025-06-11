import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3825;

const expectInternalServerError = {} satisfies Pick<Run, "tests">;

const token = process.env.VERCEL_TOKEN ? ` --token=${process.env.VERCEL_TOKEN}` : "";

const runs: Run[] = [
  {
    name: "adapter-vercel: node",
    command: `pnpm run test:run-vercel:node${token}`,
    port,
    portOption: "--listen",
    ...expectInternalServerError,
  },
];

runTests(runs, {
  vitest,
  prefix: "/api/fastify-node",
  retry: 3,
  concurrent: !process.env.CI,
});
