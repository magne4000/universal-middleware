import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    format: ["esm"],
    platform: "node",
    target: "node18",
    dts: true,
    clean: true,
    removeNodeProtocol: false,
  },
]);
