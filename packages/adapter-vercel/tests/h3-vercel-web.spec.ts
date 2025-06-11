import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3865;

const expectInternalServerError = {
  tests: {
    throwLate: {
      expectedBody: '"statusCode": 500',
    },
    throwEarlyAndLate: {
      expectedBody: '"statusCode": 500',
    },
    throwEarly: {
      expectedBody: '"statusCode": 500',
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
  prefix: "/api/h3-web",
  retry: 3,
  concurrent: !process.env.CI,
});
