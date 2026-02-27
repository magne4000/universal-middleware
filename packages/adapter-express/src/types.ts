import type { IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";
import type {
  Awaitable,
  contextSymbol,
  UniversalFn,
  UniversalHandler,
  UniversalMiddleware,
} from "@universal-middleware/core";
import type { pendingMiddlewaresSymbol, requestSymbol, wrappedResponseSymbol } from "./const.js";

export interface PossiblyEncryptedSocket extends Socket {
  encrypted?: boolean;
}

/**
 * `IncomingMessage` possibly augmented by Express-specific
 * `ip` and `protocol` properties.
 */
export interface DecoratedRequest<C extends Universal.Context = Universal.Context>
  extends Omit<IncomingMessage, "socket"> {
  ip?: string;
  protocol?: string;
  socket?: PossiblyEncryptedSocket;
  // biome-ignore lint/suspicious/noExplicitAny: we only care about the field being present
  rawBody?: any;
  originalUrl?: string;
  params?: Record<string, string>;
  [contextSymbol]?: C;
  [requestSymbol]?: Request;
}

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

/** Adapter options */
export interface NodeRequestAdapterOptions {
  /**
   * Set the origin part of the URL to a constant value.
   * It defaults to `process.env.ORIGIN`. If neither is set,
   * the origin is computed from the protocol and hostname.
   * To determine the protocol, `req.protocol` is tried first.
   * If `trustProxy` is set, `X-Forwarded-Proto` header is used.
   * Otherwise, `req.socket.encrypted` is used.
   * To determine the hostname, `X-Forwarded-Host`
   * (if `trustProxy` is set) or `Host` header is used.
   */
  origin?: string;
  /**
   * Whether to trust `X-Forwarded-*` headers. `X-Forwarded-Proto`
   * and `X-Forwarded-Host` are used to determine the origin when
   * `origin` and `process.env.ORIGIN` are not set. `X-Forwarded-For`
   * is used to determine the IP address. The leftmost values are used
   * if multiple values are set. Defaults to true if `process.env.TRUST_PROXY`
   * is set to `1`, otherwise false.
   */
  trustProxy?: boolean;
}
