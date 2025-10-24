import { createRequestAdapter, sendResponse } from "@universal-middleware/express";
import type { App } from "@universal-middleware/hattip";
import type { VercelNodeHandlerRaw } from "../utils/common.js";
import { createContext } from "../utils/hattip.js";

/**
 * Hattip app to Vercel Node request handler
 */
export function createNodeHandler(app: App): VercelNodeHandlerRaw {
  const handler = app.buildHandler();
  const requestAdapter = createRequestAdapter();

  return async function hattipHandlerVercelNode(message, response) {
    const request = requestAdapter(message);
    const res = await handler(createContext(request, "vercel-node"));
    return sendResponse(res, response);
  };
}
