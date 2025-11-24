import type { SrvxHandler } from "@universal-middleware/srvx";
import type { VercelEdgeHandlerRaw } from "../utils/common.js";

/**
 * Srvx app to Vercel Edge request handler
 */
export function createEdgeHandler(
  app: SrvxHandler<Universal.Context> | { fetch: SrvxHandler<Universal.Context> },
): VercelEdgeHandlerRaw {
  const fn = typeof app === "function" ? app : app.fetch;
  return function srvxHandlerVercelEdge(request) {
    return fn(request);
  };
}
