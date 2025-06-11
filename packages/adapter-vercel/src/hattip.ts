import type { App } from "@universal-middleware/hattip";
import { createRequestAdapter, sendResponse } from "@universal-middleware/express";
import type { VercelEdgeHandlerRaw, VercelNodeHandlerRaw } from "./common";
import type { AdapterRequestContext } from "@hattip/core";

function createContext(request: Request, platformName: string): AdapterRequestContext {
  return {
    request,
    // TODO: Support the newer `Forwarded` standard header
    ip: (request.headers.get("x-forwarded-for") || "").split(",", 1)[0].trim(),
    waitUntil() {},
    passThrough() {},
    platform: {
      name: platformName,
    },
    env(variable) {
      return process.env[variable];
    },
  };
}

/**
 * Hattip app to Vercel Edge request handler
 */
export function createEdgeHandler(app: App): VercelEdgeHandlerRaw {
  const handler = app.buildHandler();

  return function hattipHandlerVercelEdge(request) {
    return handler(createContext(request, "vercel-edge"));
  };
}

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
