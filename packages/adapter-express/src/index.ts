export {
  createHandler,
  createMiddleware,
  getContext,
  type DecoratedRequest,
  type DecoratedServerResponse,
  type NodeMiddleware,
  type NodeHandler,
} from "./common.js";
export { createRequestAdapter } from "./request.js";
export { sendResponse } from "./response.js";
export {
  connectToWeb,
  createIncomingMessage,
  createServerResponse,
  type ConnectMiddleware,
  type ConnectMiddlewareBoolean,
  type WebHandler
} from "./utils.js";
export { type UniversalExpressRouter, apply } from "./router.js";
