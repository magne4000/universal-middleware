import { defineMiddlewareTsdown } from "@universal-middleware/tsdown-config";
import universalMiddleware from "universal-middleware/rollup";

export default defineMiddlewareTsdown({
  entry: {
    dummy: "./src/handlers/handler.ts",
    params: "./src/handlers/params.handler.ts",
    "middlewares/context": "./src/middlewares/context.middleware.ts",
    "middlewares/headers": "./src/middlewares/headers.middleware.ts",
    "middlewares/guard": "./src/middlewares/guard.middleware.ts",
  },
  plugins: [universalMiddleware()],
  // Never published, and tests-tool checks the plugin's own `.d.ts` against the
  // adapter packages' types, so keep importing them through `universal-middleware`.
  inlineAdapters: false,
});
