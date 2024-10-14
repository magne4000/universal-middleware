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
        entryExportNames: ".",
        serversExportNames: "./[dir]/[server]",
      }),
    ],
    esbuildOptions(opts) {
      opts.outbase = "src";
    },
    external: ["node:zlib"],
    bundle: true,
  },
]);
