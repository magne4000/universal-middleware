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
      try {
        const { toNodeListener } = await import("h3");
        handler = toNodeListener(app);
      } catch (e) {
        throw new Error('Failed to load "h3" package. Please ensure it is installed.', { cause: e });
      }
    }
    return handler(message, response);
  };
}
