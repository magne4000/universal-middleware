import type { Get, UniversalHandler } from "@universal-middleware/core";
import { bindUniversal, universalSymbol } from "@universal-middleware/core";
import { createRequestAdapter, sendResponse } from "@universal-middleware/express";
import { getRuntime, type VercelNodeHandler } from "./common.js";

/**
 * Creates a Node request handler
 */
export function createNodeHandler<T extends unknown[], InContext extends Universal.Context>(
  handlerFactory: Get<T, UniversalHandler<InContext>>,
): Get<T, VercelNodeHandler<InContext>> {
  const requestAdapter = createRequestAdapter();

  return (...args) => {
    const handler = handlerFactory(...args);

    return bindUniversal(handler, async function universalHandlerVercelNode(message, response) {
      const request = requestAdapter(message);
      const res = await this[universalSymbol](request, {} as InContext, getRuntime(message, response));
      return sendResponse(res, response);
    });
  };
}
