import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    request: "./src/request.ts",
  },
  format: ["esm"],
  platform: "node",
  target: "node20",
  fixedExtension: false,
  nodeProtocol: false,
  dts: true,
  clean: true,
  // Externalize every bare import without resolving it — the oxc dts resolver
  // cannot follow the CJS/namespace type shapes some framework packages expose.
  deps: { neverBundle: true },
});
