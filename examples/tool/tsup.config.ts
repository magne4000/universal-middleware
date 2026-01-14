// NOTE: This package uses tsup instead of tsdown because tsdown's DTS generation
// cannot handle virtual modules created by the universal-middleware plugin.
// The universal-middleware plugin generates virtual entry points for each server adapter,
// which causes "Source file not found" errors during tsdown's DTS generation phase.
import { defineConfig } from "tsup";
import universalMiddleware from "universal-middleware/esbuild";

export default defineConfig([
  {
    entry: {
      dummy: "./src/handlers/handler.ts",
      params: "./src/handlers/params.handler.ts",
      "middlewares/context": "./src/middlewares/context.middleware.ts",
      "middlewares/headers": "./src/middlewares/headers.middleware.ts",
      "middlewares/guard": "./src/middlewares/guard.middleware.ts",
    },
    format: ["esm"],
    platform: "neutral",
    target: "es2022",
    dts: true,
    esbuildPlugins: [universalMiddleware()],
    esbuildOptions(opts) {
      opts.outbase = "src";
    },
    bundle: true,
    treeshake: true,
    removeNodeProtocol: false,
  },
]);
