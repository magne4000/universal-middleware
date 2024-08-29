import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/index.ts", "./src/utils.ts"],
    format: ["esm"],
    platform: "node",
    target: "node18",
    dts: true,
    clean: true,
  },
]);
