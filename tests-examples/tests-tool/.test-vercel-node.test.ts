import { testRun } from "./.testRun";

testRun("pnpm run dev:vercel", 23008, {
  serverIsReadyMessage: "Local:",
  portCommand: "--listen",
  prefix: "/api/node",
  noMiddleware: true,
});
