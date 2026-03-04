export { env, requestSymbol } from "@universal-middleware/node";
export const pendingMiddlewaresSymbol = Symbol.for("unPendingMiddlewares");
export const wrappedResponseSymbol = Symbol.for("unWrappedResponse");
