import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    format: ["esm"],
    platform: "node",
    target: "node20",
    dts: { resolver: 'oxc', sideEffects: true },
    clean: true,
    fixedExtension: false,
    removeNodeProtocol: false,
  },
]);
