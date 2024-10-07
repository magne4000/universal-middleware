import { middlewares } from "@universal-middleware/tests/utils";
import { handleMiddleware } from "elysia/cloudflare-pages";
import { createMiddleware } from "../src/index.js";

export const onRequest = [
  // Prefer using createMiddleware from @universal-middleware/cloudflare directly here
  handleMiddleware(createMiddleware(middlewares[0])()),
  handleMiddleware(createMiddleware(middlewares[1])()),
  handleMiddleware(createMiddleware(middlewares[2])()),
];
