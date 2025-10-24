import { createRequestAdapter, sendResponse } from "@universal-middleware/express";
import type { App } from "@universal-middleware/hono";
import type { VercelNodeHandlerRaw } from "../utils/common.js";

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
