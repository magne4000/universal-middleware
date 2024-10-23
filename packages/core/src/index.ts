declare global {
  namespace Universal {
    interface Context extends Record<string | number | symbol, unknown> {}
  }
}

export type * from "./types.js";
export { getAdapterRuntime } from "./adapter.js";
export { mergeHeadersInto, nodeHeadersToWeb, isBodyInit } from "./utils.js";
export { pipe } from "./pipe.js";
export { params } from "./route.js";
export { env } from "./env.js";
export { contextSymbol, runtimeSymbol } from "./const.js";
