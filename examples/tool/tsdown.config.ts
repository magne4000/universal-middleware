import { defineConfig } from "tsdown";
import universalMiddleware from "universal-middleware/rollup";

export default defineConfig([
  {
    entry: {
      dummy: "./src/handlers/handler.ts",
      params: "./src/handlers/params.handler.ts",
      "middlewares/context": "./src/middlewares/context.middleware.ts",
      "middlewares/headers": "./src/middlewares/headers.middleware.ts",
      "middlewares/guard": "./src/middlewares/guard.middleware.ts",
    },
    format: ["esm"],
    platform: "neutral",
    target: "es2022",
    dts: false,
    plugins: [universalMiddleware({ dts: true })],
    treeshake: true,
    fixedExtension: false,
    removeNodeProtocol: false,
  },
]);
