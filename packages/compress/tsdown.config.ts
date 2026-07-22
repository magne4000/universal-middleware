import universalMiddleware from "universal-middleware/rollup";
import { defineMiddlewareTsdown, middlewareServers } from "@universal-middleware/tsdown-config";

export default defineMiddlewareTsdown({
  entry: ["./src/middleware.ts"],
  plugins: [
    universalMiddleware({
      servers: [...middlewareServers],
      entryExportNames: ".",
      serversExportNames: "./[dir]/[server]",
    }),
  ],
  // `fflate` and core are devDependencies tsup bundled; keep bundling them.
  deps: { neverBundle: true, alwaysBundle: ["fflate", "@universal-middleware/core"] },
});
