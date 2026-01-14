import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    format: ["esm"],
    platform: "neutral",
    target: "es2022",
    dts: { resolver: 'oxc', sideEffects: true },
    clean: true,
    external: ["h3"],
    fixedExtension: false,
    removeNodeProtocol: false,
  },
]);
