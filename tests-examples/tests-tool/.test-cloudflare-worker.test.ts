import { testRun } from "./.testRun";

testRun("pnpm run dev:worker --inspector-port 43005", 23005, {
  serverIsReadyMessage: "Ready on",
  noCompression: true,
});
