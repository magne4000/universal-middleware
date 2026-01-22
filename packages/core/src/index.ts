declare global {
  namespace Universal {
    interface Context extends Record<string | number | symbol, unknown> {}
  }
}

export { getAdapterRuntime } from "./adapter.js";
export { compileEnhance } from "./compile.js";
export {
  contextSymbol,
  MiddlewareOrder,
  methodSymbol,
  nameSymbol,
  orderSymbol,
  pathSymbol,
  universalSymbol,
} from "./const.js";
export { env } from "./env.js";
export { pipe } from "./pipe.js";
export { params } from "./route.js";
export { apply, applyAsync, pipeRoute, UniversalRouter } from "./router.js";
export { getRuntimeKey } from "./runtime.js";
export type * from "./types.js";
export {
  attachUniversal,
  bindUniversal,
  cloneRequest,
  enhance,
  getUniversal,
  getUniversalProp,
  isBodyInit,
  mergeHeadersInto,
  nodeHeadersToWeb,
  url,
} from "./utils.js";
