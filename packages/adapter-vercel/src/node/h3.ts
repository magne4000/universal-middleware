import type { App } from "@universal-middleware/h3";
import { toNodeListener } from "h3";
import type { VercelNodeHandlerRaw } from "../utils/common.js";

/**
 * H3 app to Vercel Node request handler
 */
export function createNodeHandler(app: App): VercelNodeHandlerRaw {
  const handler = toNodeListener(app);

  return async function h3HandlerVercelNode(message, response) {
    return handler(message, response);
  };
}
