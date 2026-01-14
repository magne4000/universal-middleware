import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: {
      index: "./src/index.ts",
      cookie: "./src/cookies/index.ts",
    },
    format: ["esm"],
    noExternal: ["rou3"],
    platform: "node",
    target: "node20",
    dts: { resolver: 'oxc', sideEffects: true },
    clean: true,
    fixedExtension: false,
    removeNodeProtocol: false,
  },
]);
