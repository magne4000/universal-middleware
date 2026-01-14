import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: {
      index: "./src/index.ts",
      edge: "./src/edge.ts",
      node: "./src/node.ts",

      "edge/servers": "./src/edge/index.ts",
      "node/servers": "./src/node/index.ts",

      // edge
      "hono/edge": "./src/edge/hono.ts",
      "h3/edge": "./src/edge/h3.ts",
      "hattip/edge": "./src/edge/hattip.ts",
      "elysia/edge": "./src/edge/elysia.ts",
      "express/edge": "./src/edge/express.ts",
      "fastify/edge": "./src/edge/fastify.ts",
      "srvx/edge": "./src/edge/srvx.ts",

      // node
      "hono/node": "./src/node/hono.ts",
      "h3/node": "./src/node/h3.ts",
      "hattip/node": "./src/node/hattip.ts",
      "elysia/node": "./src/node/elysia.ts",
      "express/node": "./src/node/express.ts",
      "fastify/node": "./src/node/fastify.ts",
      "srvx/node": "./src/node/srvx.ts",

      // edge + node
      hono: "./src/hono.ts",
      h3: "./src/h3.ts",
      hattip: "./src/hattip.ts",
      elysia: "./src/elysia.ts",
      express: "./src/express.ts",
      fastify: "./src/fastify.ts",
      srvx: "./src/srvx.ts",
    },
    format: ["esm"],
    platform: "neutral",
    target: "es2022",
    dts: { resolver: 'oxc', sideEffects: true },
    clean: true,
    fixedExtension: false,
    removeNodeProtocol: false,
  },
]);
