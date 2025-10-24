import type { SrvxHandler } from "@universal-middleware/srvx";
import type { VercelEdgeHandlerRaw } from "../utils/common.js";

/**
 * Srvx app to Vercel Edge request handler
 */
export function createEdgeHandler(app: SrvxHandler<Universal.Context>): VercelEdgeHandlerRaw {
  return function srvxHandlerVercelEdge(request) {
    return app(request);
  };
}
