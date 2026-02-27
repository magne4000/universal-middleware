export const requestSymbol = Symbol.for("unRequest");
export const pendingMiddlewaresSymbol = Symbol.for("unPendingMiddlewares");
export const wrappedResponseSymbol = Symbol.for("unWrappedResponse");

export const env: Record<string, string | undefined> =
  typeof globalThis.process?.env !== "undefined"
    ? globalThis.process.env
    : typeof (import.meta as unknown as Record<"env", Record<string, string | undefined>>)?.env !== "undefined"
      ? (import.meta as unknown as Record<"env", Record<string, string | undefined>>).env
      : {};
