import { type Run, runTests } from "@universal-middleware/tests";
import * as vitest from "vitest";

const port = 3850;

const expectInternalServerError = {
  tests: {
    throwLate: {
      expectedBody: "A server error has occurred",
    },
    throwEarlyAndLate: {
      expectedBody: "A server error has occurred",
    },
    throwEarly: {
      expectedBody: "A server error has occurred",
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
  prefix: "/api/web",
  retry: 3,
  concurrent: !process.env.CI,
});
