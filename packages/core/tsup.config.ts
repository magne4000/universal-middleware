import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "./src/index.ts",
      cookie: "./src/cookies/index.ts",
    },
    format: ["esm"],
    noExternal: ["rou3"],
    platform: "node",
    target: "node18",
    dts: true,
    clean: true,
    removeNodeProtocol: false,
  },
]);
