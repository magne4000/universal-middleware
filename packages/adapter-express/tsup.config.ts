import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "./src/index.ts",
      request: "./src/request.ts",
    },
    format: ["esm"],
    platform: "node",
    target: "node20",
    dts: true,
    clean: true,
    removeNodeProtocol: false,
  },
]);
