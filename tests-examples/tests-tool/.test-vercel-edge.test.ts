import { testRun } from "./.testRun";

const token = process.env.VERCEL_TOKEN ? ` --token=${process.env.VERCEL_TOKEN}` : "";

testRun(`pnpm run dev:vercel${token}`, 23009, {
  serverIsReadyMessage: "Local:",
  portCommand: "--listen",
  prefix: "/api/web",
  noCompression: true,
});
