import { middlewares } from "@universal-middleware/tests/utils";
import { handleMiddleware } from "hono/cloudflare-pages";
import { createMiddleware } from "../src/index.js";

export const onRequest = [
  handleMiddleware(createMiddleware(middlewares[0])()),
  handleMiddleware(createMiddleware(middlewares[1])()),
  handleMiddleware(createMiddleware(middlewares[2])()),
];
