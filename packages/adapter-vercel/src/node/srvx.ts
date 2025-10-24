import type { SrvxHandler } from "@universal-middleware/srvx";
import type { VercelNodeHandlerRaw } from "../utils/common.js";

/**
 * Srvx app to Vercel Node request handler
 */
export function createNodeHandler(app: SrvxHandler<Universal.Context>): VercelNodeHandlerRaw {
  return async function srvxHandlerVercelNode(message, response) {
    const { createRequestAdapter, sendResponse } = await import("@universal-middleware/express");
    const requestAdapter = createRequestAdapter();
    const request = requestAdapter(message);
    const res = await app(request);
    return sendResponse(res, response);
  };
}
