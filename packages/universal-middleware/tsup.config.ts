import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      rollup: "src/rollup.ts",
      esbuild: "src/esbuild.ts",
      "adapters/cloudflare": "src/adapters/cloudflare.ts",
      "adapters/elysia": "src/adapters/elysia.ts",
      "adapters/express": "src/adapters/express.ts",
      "adapters/fastify": "src/adapters/fastify.ts",
      "adapters/h3": "src/adapters/h3.ts",
      "adapters/hattip": "src/adapters/hattip.ts",
      "adapters/hono": "src/adapters/hono.ts",
      "adapters/srvx": "src/adapters/srvx.ts",
      "adapters/vercel": "src/adapters/vercel.ts",
      "adapters/webroute": "src/adapters/webroute.ts",
    },
    format: "esm",
    dts: true,
    splitting: true,
    bundle: true,
    removeNodeProtocol: false,
  },
]);
