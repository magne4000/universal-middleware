// package: @universal-middleware-examples/tool
// file: src/handlers/params.handler.ts

import type { UniversalHandler } from "@universal-middleware/core";
import { params } from "@universal-middleware/core";

interface RouteParamOption {
  route?: string;
}

const handler = ((options?) => (request, _context, runtime) => {
  const myParams = params(request, runtime, options?.route);

  if (myParams === null || !myParams.name) {
    // Provide a useful error message to the user
    throw new Error(
      "A route parameter named `:name` is required. " +
        "You can set your server route as `/user/:name`, or use the `route` option of this middleware " +
        "to achieve the same purpose.",
    );
  }

  return new Response(`User name is: ${myParams.name}`);
}) satisfies (options?: RouteParamOption) => UniversalHandler;

export default handler;
