import { serve } from "@hono/node-server";
import { type UniversalHandler, params } from "@universal-middleware/core";
import { createHandler } from "@universal-middleware/hono";
import { Hono } from "hono";
import { UniversalHonoRouter, apply, withRoute } from "./index";

const app = new Hono();

const router = new UniversalHonoRouter(app);

const paramsHandler = (() =>
  withRoute(
    (request, _context, runtime) => {
      const myParams = params(request, runtime, undefined);

      if (myParams === null || !myParams.name) {
        // Provide a useful error message to the user
        throw new Error(
          "A route parameter named `:name` is required. " +
            "You can set your server route as `/user/:name`, or use the `route` option of this middleware " +
            "to achieve the same purpose.",
        );
      }

      return new Response(`User name is: ${myParams.name}`);
    },
    "GET",
    "/user/:name",
  )) satisfies () => UniversalHandler;

// 1. Auto register UNIVERSAL routes and middlewares defined as ejectable
// 2. Manually register UNIVERSAL routes and middlewares imported by user
// 3. Manually register SPECIFIC routes and middlewares imported by user
// 3. Manually register SPECIFIC routes and middlewares from FileSystem (i.e. cloudflare pages)??
// apply(router, [paramsHandler(), withRoute(() => new Response("OK"), "GET", "/")]);
apply(router, [createHandler(paramsHandler)(), withRoute(createHandler(() => () => new Response("OK"))(), "GET", "/")]);

serve(app, (info) => {
  console.log(`Listening on http://localhost:${info.port}`); // Listening on http://localhost:3000
});
