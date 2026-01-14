// NOTE: This package uses tsup instead of tsdown because tsdown's DTS generation
// cannot handle virtual modules created by the universal-middleware plugin.
// The universal-middleware plugin generates virtual entry points for each server adapter,
// which causes "Source file not found" errors during tsdown's DTS generation phase.
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
        servers: ["hono", "express", "hattip", "fastify", "h3", "webroute", "elysia", "srvx"],
        entryExportNames: ".",
        serversExportNames: "./[dir]/[server]",
      }),
    ],
    esbuildOptions(opts) {
      opts.outbase = "src";
    },
    external: [/node:.*/],
    bundle: true,
    treeshake: true,
    removeNodeProtocol: false,
  },
]);
