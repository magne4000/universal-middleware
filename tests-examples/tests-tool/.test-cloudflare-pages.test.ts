import { testRun } from "./.testRun";

testRun("pnpm run dev:pages --inspector-port 43006", 23006, {
  serverIsReadyMessage: "Ready on",
  noCompression: true,
});
