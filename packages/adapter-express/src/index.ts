import type { DecoratedRequest, DecoratedServerResponse } from "./common.js";

export type { DecoratedRequest, DecoratedServerResponse };

/** Connect/Express style request listener/middleware */
export type NodeMiddleware = (
  req: DecoratedRequest,
  res: DecoratedServerResponse,
  next?: () => void,
) => void;

export { createHandler } from "./common.js";
export { createRequestAdapter } from "./request.js";
