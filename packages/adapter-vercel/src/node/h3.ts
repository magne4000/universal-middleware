import type { App } from "@universal-middleware/h3";
import type { NodeListener } from "h3";
import type { VercelNodeHandlerRaw } from "../utils/common.js";

/**
 * H3 app to Vercel Node request handler
 */
export function createNodeHandler(app: App): VercelNodeHandlerRaw {
  let handler: NodeListener | undefined;

  return async function h3HandlerVercelNode(message, response) {
    if (!handler) {
      const { toNodeListener } = await import("h3");
      handler = toNodeListener(app);
    }
    return handler(message, response);
  };
}
