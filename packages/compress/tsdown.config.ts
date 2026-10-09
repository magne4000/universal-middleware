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
  // `fflate` is a devDependency, so inline it into the bundle (core and the
  // adapters, also devDependencies, are inlined by `defineMiddlewareTsdown`).
  deps: { alwaysBundle: ["fflate"], onlyBundle: ["fflate"] },
});
