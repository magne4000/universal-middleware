import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    format: ["esm"],
    platform: "node",
    target: "node18",
    dts: {
      banner: `declare global {
  namespace Universal {
    interface Context extends Record<string | number | symbol, unknown> {}
  }
}`,
    },
    clean: true,
  },
]);
