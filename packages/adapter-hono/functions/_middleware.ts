import { middlewares } from "@universal-middleware/tests/utils";
import { handleMiddleware } from "hono/cloudflare-pages";
import { createMiddleware } from "../src/index.js";

export const onRequest = [
  // Prefer using createMiddleware from @universal-middleware/cloudflare directly here
  handleMiddleware(createMiddleware(() => middlewares.throwEarly)()),
  handleMiddleware(createMiddleware(() => middlewares.throwLate)()),
  handleMiddleware(createMiddleware(() => middlewares.guard)()),
  handleMiddleware(createMiddleware(() => middlewares.contextSync)()),
  handleMiddleware(createMiddleware(() => middlewares.updateHeaders)()),
  handleMiddleware(createMiddleware(() => middlewares.contextAsync)()),
];
