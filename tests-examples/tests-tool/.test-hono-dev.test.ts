import { testRun } from "./.testRun";

testRun("pnpm run dev:hono", 23000, {
  serverIsReadyMessage: "ready",
});
