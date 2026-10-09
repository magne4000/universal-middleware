import { defineMiddlewareTsdown, middlewareServers } from "@universal-middleware/tsdown-config";
import universalMiddleware from "universal-middleware/rollup";

export default defineMiddlewareTsdown({
  entry: ["./src/middleware.ts"],
  plugins: [
    universalMiddleware({
      servers: [...middlewareServers],
      entryExportNames: ".",
      serversExportNames: "./[dir]/[server]",
    }),
  ],
  // `fflate` and core are devDependencies, so inline them into the bundle.
  deps: { neverBundle: true, alwaysBundle: ["fflate", "@universal-middleware/core"] },
});
