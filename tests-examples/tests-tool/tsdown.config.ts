import { defineTsdown } from "@universal-middleware/tsdown-config";

export default defineTsdown({
  entry: {
    express: "src/express-entry.ts",
    fastify: "src/fastify-entry.ts",
    elysia: "src/elysia-entry.ts",
    h3: "src/h3-entry.ts",
    hattip: "src/hattip-entry.ts",
    srvx: "src/srvx-entry.ts",
    hono: "src/hono-entry.ts",
  },
  runtime: "node",
  dts: false,
});
