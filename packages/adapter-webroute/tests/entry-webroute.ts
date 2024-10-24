import { args, bun, deno } from "@universal-middleware/tests";
import { handler, middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import { createAdapter } from "@webroute/middleware";
import { Route, route } from "@webroute/route";
import { createRadixRouter } from "@webroute/router";
import { Hono, type MiddlewareHandler } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { createHandler, createMiddleware } from "../src/index.js";

const app = new Hono();

const m1 = middlewares[0];
const m2 = middlewares[1];
const m3 = middlewares[2];

const router = createRadixRouter([
  Route.normalise(route("/user/:name").method("get").handle(createHandler(routeParamHandler)())),
  // @ts-ignore
  Route.normalise(
    route("/")
      .method("get")
      .use(createMiddleware(m1)())
      .use(createMiddleware(m2)())
      .use(createMiddleware(m3)())
      .handle(createHandler(handler)()),
  ),
]);

// standard Hono middleware
app.use(secureHeaders());

const toHono = createAdapter<MiddlewareHandler>((c, next) => {
  return {
    async onData(data) {
      c.set("state", { ...c.get("state"), ...data });
      await next();
    },
    async onEmpty() {
      await next();
    },
    async onResponse(response) {
      return response;
    },
    async onResponseHandler(handler) {
      await next();
      return handler(c.res);
    },
  };
});

// universal handler
app.use(
  "*",
  toHono((c) => {
    const handler = router.match(c.req.raw);
    if (handler) {
      return handler(c.req.raw);
    }
    return new Response("NOT FOUND", { status: 404 });
  }),
);

const port = args.port ? Number.parseInt(args.port) : 3000;

if (deno) {
  // @ts-ignore
  Deno.serve(
    {
      port,
      onListen() {
        console.log(`Server listening on http://localhost:${port}`);
      },
    },
    app.fetch,
  );
} else if (!bun) {
  const { serve } = await import("@hono/node-server");
  serve(
    {
      fetch: app.fetch,
      port,
    },
    () => {
      console.log(`Server listening on http://localhost:${port}`);
    },
  );
}

// Bun
export default {
  port,
  fetch: app.fetch,
};
