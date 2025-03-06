declare global {
  namespace Universal {
    interface Context extends Record<string | number | symbol, unknown> {}
  }
}

export type * from "./types.js";
export { getAdapterRuntime } from "./adapter.js";
export { getRuntimeKey } from "./runtime.js";
export {
  mergeHeadersInto,
  nodeHeadersToWeb,
  isBodyInit,
  cloneRequest,
  bindUniversal,
  attachUniversal,
  getUniversal,
  getUniversalProp,
  url,
  enhance,
} from "./utils.js";
export { pipe } from "./pipe.js";
export { params } from "./route.js";
export { env } from "./env.js";
export { universalSymbol, methodSymbol, nameSymbol, orderSymbol, pathSymbol, MiddlewareOrder } from "./const.js";
export { UniversalRouter, apply, applyAsync, pipeRoute } from "./router.js";
