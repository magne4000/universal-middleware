import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts", "src/rollup.ts", "src/esbuild.ts"],
    format: "esm",
    dts: true,
    splitting: true,
    bundle: true,
  },
]);
