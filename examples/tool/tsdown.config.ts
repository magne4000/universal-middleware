import universalMiddleware from "universal-middleware/rollup";
import { defineMiddlewareTsdown } from "@universal-middleware/tsdown-config";

export default defineMiddlewareTsdown({
  entry: {
    dummy: "./src/handlers/handler.ts",
    params: "./src/handlers/params.handler.ts",
    "middlewares/context": "./src/middlewares/context.middleware.ts",
    "middlewares/headers": "./src/middlewares/headers.middleware.ts",
    "middlewares/guard": "./src/middlewares/guard.middleware.ts",
  },
  plugins: [universalMiddleware()],
});
