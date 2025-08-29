import {
  apply as applyCore,
  type EnhancedMiddleware,
  type UniversalHandler,
  UniversalRouter,
  universalSymbol,
} from "@universal-middleware/core";
import { createHandler } from "./common";

export function apply(middlewares: EnhancedMiddleware[]) {
  const router = new UniversalRouter(true, true);
  applyCore(router, middlewares);

  return createHandler(() => router[universalSymbol] as UniversalHandler)();
}
