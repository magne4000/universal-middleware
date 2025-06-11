import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "./src/index.ts",
      hono: "./src/hono.ts",
      h3: "./src/h3.ts",
      hattip: "./src/hattip.ts",
    },
    format: ["esm"],
    platform: "neutral",
    target: "es2022",
    dts: true,
    clean: true,
    removeNodeProtocol: false,
  },
]);
