declare global {
  namespace Universal {
    interface Context extends Record<string | number | symbol, unknown> {}
  }
}

export type * from "./types.js";
export { getAdapterRuntime } from "./adapter.js";
export {
  mergeHeadersInto,
  nodeHeadersToWeb,
  isBodyInit,
  initRequestWeb,
  initRequestNode,
  getRequestContextAndRuntime,
  setRequestContext,
} from "./utils.js";
export { pipe } from "./pipe.js";
export { createGenericHandler, createGenericMiddleware } from "./common.js";
export { params } from "./route.js";
export { env } from "./env.js";
