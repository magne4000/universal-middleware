import {
  apply as applyCore,
  type EnhancedMiddleware,
  type UniversalHandler,
  UniversalRouter,
  universalSymbol,
} from "@universal-middleware/core";
import { createHandler } from "./common";

type EnhancedMiddlewareCloudflare =
  | EnhancedMiddleware
  | EnhancedMiddleware<Universal.Context, Universal.Context, "cloudflare-worker">;

export function apply(middlewares: EnhancedMiddlewareCloudflare[]) {
  const router = new UniversalRouter(true, true);
  applyCore(router, middlewares as EnhancedMiddleware[]);

  return createHandler(() => router[universalSymbol] as UniversalHandler)();
}
