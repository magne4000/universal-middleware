import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  format: ["esm"],
  platform: "neutral",
  target: "es2022",
  fixedExtension: false,
  nodeProtocol: false,
  dts: true,
  clean: true,
  // Externalize every bare import (frameworks are type-only peers). `true` keeps
  // them external "as written" without resolving, which the oxc dts resolver
  // needs — it cannot follow the CJS/namespace/triple-slash type shapes several
  // frameworks (`@cloudflare/workers-types`, `fastify`, `express`, `bun`) use.
  deps: { neverBundle: true },
});
