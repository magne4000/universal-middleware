import { routeParamHandler } from "@universal-middleware/tests/utils";
import { handleMiddleware } from "hono/cloudflare-pages";
import { createMiddleware } from "../../src/index.js";

export const onRequest = handleMiddleware(createMiddleware(routeParamHandler)());
