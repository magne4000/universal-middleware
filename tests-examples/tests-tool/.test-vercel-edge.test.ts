import { testRun } from "./.testRun";

testRun("pnpm run dev:vercel", 23009, {
  serverIsReadyMessage: "Local:",
  portCommand: "--listen",
  prefix: "/api/web",
  noMiddleware: true,
});
