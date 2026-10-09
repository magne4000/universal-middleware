import type { DecoratedRequest, RequestOrigin } from "@universal-middleware/node";

export type { DecoratedRequest, NodeRequestAdapterOptions, PossiblyEncryptedSocket } from "@universal-middleware/node";
export { createRequestAdapter, env, requestSymbol } from "@universal-middleware/node";

/**
 * The host Express gives `req` under its `trust proxy` setting: the first `X-Forwarded-Host`, when the setting
 * trusts the peer, as Express 5's `req.host` reads it. Express 4 has no such getter: its `req.host` drops the port.
 * The protocol needs nothing: `req.protocol` follows `trust proxy` in both, and the request adapter reads it.
 */
export function expressOrigin(req: DecoratedRequest): RequestOrigin | undefined {
  const forwarded = req.headers["x-forwarded-host"];
  if (!forwarded || !trustsPeer(req)) return;
  return { host: String(forwarded).split(",", 1)[0].trim() };
}

/** Whether the app's `trust proxy` setting trusts the peer that sent `req` */
function trustsPeer(req: DecoratedRequest): boolean {
  // `req.app` is the Express app (a function), which compiles its `trust proxy` setting to `trust proxy fn`
  const app: unknown = "app" in req ? req.app : undefined;
  if (typeof app !== "function" || !("get" in app) || typeof app.get !== "function") return false;
  const trust: unknown = app.get("trust proxy fn");
  return typeof trust === "function" && trust(req.socket?.remoteAddress, 0) === true;
}
