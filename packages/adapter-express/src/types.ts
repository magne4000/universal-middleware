import type { ServerResponse } from "node:http";
import type {
  Awaitable,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import type {
  DecoratedRequest,
  NodeRequestAdapterOptions,
  PossiblyEncryptedSocket,
} from "@universal-middleware/node";
import type { pendingMiddlewaresSymbol, wrappedResponseSymbol } from "./const.js";

export type { DecoratedRequest, NodeRequestAdapterOptions, PossiblyEncryptedSocket };

export interface DecoratedServerResponse extends ServerResponse {
  [pendingMiddlewaresSymbol]?: ((response: Response) => Awaitable<Response | undefined>)[];
  [wrappedResponseSymbol]?: boolean;
}

/** Connect/Express style request listener/middleware */
export type NodeMiddleware<In extends Universal.Context, Out extends Universal.Context> = UniversalFn<
  UniversalMiddleware<In, Out>,
  <R>(req: DecoratedRequest<In>, res: DecoratedServerResponse, next?: (err?: unknown) => void) => R
>;
export type NodeHandler<In extends Universal.Context> = UniversalFn<
  UniversalHandler<In>,
  <R>(req: DecoratedRequest<In>, res: DecoratedServerResponse, next?: (err?: unknown) => void) => R
>;

/** Adapter options */
export interface NodeAdapterHandlerOptions extends NodeRequestAdapterOptions {}
export interface NodeAdapterMiddlewareOptions extends NodeRequestAdapterOptions {}
