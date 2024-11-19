import { testRun } from "./.testRun";

testRun("pnpm run dev:vercel", 23008, {
  serverIsReadyMessage: "Ready on",
});
