import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3820;

const expectInternalServerError = {} satisfies Pick<Run, "tests">;

const token = process.env.VERCEL_TOKEN ? ` --token=${process.env.VERCEL_TOKEN}` : "";

const runs: Run[] = [
  {
    name: "adapter-vercel: node",
    command: `pnpm run test:run-vercel:node${token}`,
    port,
    portOption: "--listen",
    streamCancel: "skip",
    ...expectInternalServerError,
  },
];

runTests(runs, {
  vitest,
  prefix: "/api/express-node",
  retry: 3,
});
