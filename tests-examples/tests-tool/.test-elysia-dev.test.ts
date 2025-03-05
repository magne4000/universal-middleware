import { testRun } from "./.testRun";

testRun("pnpm run dev:elysia", 23007, {
  doNotFailOnWarning: true,
});
