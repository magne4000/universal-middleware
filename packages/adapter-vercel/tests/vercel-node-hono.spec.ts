import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3810;

const expectInternalServerError = {
  tests: {
    throwLate: {
      expectedBody: "Internal Server Error",
    },
    throwEarlyAndLate: {
      expectedBody: "Internal Server Error",
    },
    throwEarly: {
      expectedBody: "Internal Server Error",
    },
  },
} satisfies Pick<Run, "tests">;

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
  prefix: "/api/node-hono",
  retry: 3,
  concurrent: !process.env.CI,
});
