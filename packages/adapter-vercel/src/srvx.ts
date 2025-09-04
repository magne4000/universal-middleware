import { createRequestAdapter, sendResponse } from "@universal-middleware/express";
import type { SrvxHandler } from "@universal-middleware/srvx";
import type { VercelEdgeHandlerRaw, VercelNodeHandlerRaw } from "./common";

/**
 * Srvx app to Vercel Edge request handler
 */
export function createEdgeHandler(app: SrvxHandler<Universal.Context>): VercelEdgeHandlerRaw {
  return function srvxHandlerVercelEdge(request) {
    return app(request);
  };
}

/**
 * Srvx app to Vercel Node request handler
 */
export function createNodeHandler(app: SrvxHandler<Universal.Context>): VercelNodeHandlerRaw {
  const requestAdapter = createRequestAdapter();

  return async function srvxHandlerVercelNode(message, response) {
    const request = requestAdapter(message);
    const res = await app(request);
    return sendResponse(res, response);
  };
}
