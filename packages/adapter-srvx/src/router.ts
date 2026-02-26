import {
  apply as applyCore,
  type EnhancedMiddleware,
  type UniversalHandler,
  UniversalRouter,
  universalSymbol,
} from "@universal-middleware/core";
import { createHandler } from "./common";

type EnhancedMiddlewareSrvx = EnhancedMiddleware | EnhancedMiddleware<Universal.Context, Universal.Context, "srvx">;

export function apply(middlewares: EnhancedMiddlewareSrvx[]) {
  const router = new UniversalRouter(true, true);
  applyCore(router, middlewares as EnhancedMiddleware[]);

  return createHandler(() => router[universalSymbol] as UniversalHandler)();
}
