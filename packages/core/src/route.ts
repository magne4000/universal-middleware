import { parse } from "regexparam";
import type { RuntimeAdapter } from "./types";

function exec(
  path: string,
  result: {
    keys: string[];
    pattern: RegExp;
  },
) {
  let i = 0;
  const out: Record<string, string> = {};
  const matches = result.pattern.exec(path);
  if (!matches) return null;

  while (i < result.keys.length) {
    if (matches[++i]) {
      out[result.keys[i]] = matches[i];
    }
  }
  return out;
}

function paramsFromRequest(request: Request, path: string): null | Record<string, string> {
  const url = new URL(request.url);
  return exec(url.pathname, parse(path));
}

/**
 * Retrieve path parameters from URL patterns.
 * For servers supporting URL patterns like '/user/:name', the parameters will be available under runtime.params.
 * For other adapters, the `path` argument must be present. Then parameters are extracted thanks to `regexparam`.
 *
 * If you are writing a Universal Handler or Middleware and need access to path parameters, we suggest to follow
 * this next example.
 *
 * @example
 * import { params, type Get, type UniversalHandler } from "@universal-middleware/core";
 *
 * interface Options {
 *   route?: string;
 * }
 *
 * const myMiddleware = ((options?: Options) => (request, ctx, runtime) => {
 *   const myParams = params(request, runtime, options?.route);
 *
 *   if (myParams === null) {
 *     // Provide a useful Error message to the user
 *     throw new Error("A path parameter named `:name` is required. " +
 *                     "You can set your server route as `/user/:name`, or use the `route` option of this middleware " +
 *                     "to achieve the same purpose.");
 *   }
 *
 *   // ...
 * }) satisfies Get<[Options | undefined], UniversalHandler>;
 *
 * export default myMiddleware;
 */
export function params(
  request: Request,
  runtime: RuntimeAdapter,
  path: string | undefined,
): null | Record<string, string> {
  if (typeof path === "string") {
    return paramsFromRequest(request, path);
  }
  return runtime.params ?? null;
}
