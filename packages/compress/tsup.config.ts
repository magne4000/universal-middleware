import { defineConfig } from "tsup";
import universalMiddleware from "universal-middleware/esbuild";

export default defineConfig([
  {
    entry: ["./src/middleware.ts"],
    format: ["esm"],
    platform: "neutral",
    target: "es2022",
    dts: true,
    esbuildPlugins: [
      universalMiddleware({
        servers: ["hono", "express", "hattip", "fastify", "h3", "webroute", "elysia"],
        entryExportNames: ".",
        serversExportNames: "./[dir]/[server]",
      }),
    ],
    esbuildOptions(opts) {
      opts.outbase = "src";
    },
    external: ["node:zlib"],
    bundle: true,
    treeshake: true,
    removeNodeProtocol: false,
  },
]);
