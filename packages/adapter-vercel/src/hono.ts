import type { App } from "@universal-middleware/hono";
import { createRequestAdapter, sendResponse } from "@universal-middleware/express";
import type { VercelEdgeHandlerRaw, VercelNodeHandlerRaw } from "./common";

/**
 * Hono app to Vercel Edge request handler
 */
export function createEdgeHandler(app: App): VercelEdgeHandlerRaw {
  return function honoHandlerVercelEdge(request) {
    return app.fetch(request);
  };
}

/**
 * Hono app to Vercel Node request handler
 */
export function createNodeHandler(app: App): VercelNodeHandlerRaw {
  const requestAdapter = createRequestAdapter();

  return async function honoHandlerVercelNode(message, response) {
    const request = requestAdapter(message);
    const res = await app.fetch(request);
    return sendResponse(res, response);
  };
}
