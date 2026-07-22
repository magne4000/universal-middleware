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
  // Externalize every bare import without resolving it — the oxc dts resolver
  // cannot follow the CJS/namespace type shapes some framework packages expose.
  // `elysia` was already externalized under tsup.
  deps: { neverBundle: true },
});
