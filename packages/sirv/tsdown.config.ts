import universalMiddleware from "universal-middleware/rollup";
import { defineMiddlewareTsdown, middlewareServers } from "@universal-middleware/tsdown-config";

// `@universal-middleware/core` is a runtime dependency (imported for `url`), so
// the default `neverBundle: true` correctly keeps it external.
export default defineMiddlewareTsdown({
  entry: ["./src/middleware.ts"],
  plugins: [
    universalMiddleware({
      servers: [...middlewareServers],
      entryExportNames: ".",
      serversExportNames: "./[dir]/[server]",
    }),
  ],
});
