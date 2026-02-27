import { args, bun, deno } from "@universal-middleware/tests";
import {
  guarded,
  handler,
  middlewares,
  routeParamHandler,
  streamCancelHandler,
  streamCancelStatusHandler,
  throwEarlyAndLateHandler,
  throwEarlyHandler,
  throwLateHandler,
} from "@universal-middleware/tests/utils";
import { createAdapter } from "@webroute/middleware";
import { Route, route } from "@webroute/route";
import { createRadixRouter } from "@webroute/router";
import { Hono, type MiddlewareHandler } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { createHandler, createMiddleware } from "../src/index.js";

const app = new Hono();

const router = createRadixRouter([
  // @ts-expect-error webroute
  Route.normalise(route("/user/:name").method("get").handle(createHandler(routeParamHandler)())),
  Route.normalise(route("/stream-cancel").method("get").handle(createHandler(streamCancelHandler)())),
  // @ts-expect-error webroute
  Route.normalise(route("/stream-cancel-status").method("get").handle(createHandler(streamCancelStatusHandler)())),
  // @ts-expect-error webroute
  Route.normalise(
    route("/")
      .method("get")
      .use(createMiddleware(() => middlewares.contextSync)())
      .use(createMiddleware(() => middlewares.updateHeaders)())
      .use(createMiddleware(() => middlewares.contextAsync)())
      .handle(createHandler(handler)()),
  ),
  // @ts-expect-error webroute
  Route.normalise(
    route("/guarded")
      .method("get")
      .use(createMiddleware(() => middlewares.guard)())
      .use(createMiddleware(() => middlewares.contextSync)())
      .use(createMiddleware(() => middlewares.updateHeaders)())
      .use(createMiddleware(() => middlewares.contextAsync)())
      .handle(createHandler(guarded)()),
  ),
  // @ts-expect-error webroute
  Route.normalise(
    route("/throw-early")
      .method("get")
      .use(createMiddleware(() => middlewares.throwEarly)())
      .use(createMiddleware(() => middlewares.contextSync)())
      .use(createMiddleware(() => middlewares.updateHeaders)())
      .use(createMiddleware(() => middlewares.contextAsync)())
      .handle(createHandler(throwEarlyHandler)()),
  ),
  // @ts-expect-error webroute
  Route.normalise(
    route("/throw-late")
      .method("get")
      .use(createMiddleware(() => middlewares.throwLate)())
      .use(createMiddleware(() => middlewares.contextSync)())
      .use(createMiddleware(() => middlewares.updateHeaders)())
      .use(createMiddleware(() => middlewares.contextAsync)())
      .handle(createHandler(throwLateHandler)()),
  ),
  // @ts-expect-error webroute
  Route.normalise(
    route("/throw-early-and-late")
      .method("get")
      .use(createMiddleware(() => middlewares.throwEarly)())
      .use(createMiddleware(() => middlewares.throwLate)())
      .use(createMiddleware(() => middlewares.contextSync)())
      .use(createMiddleware(() => middlewares.updateHeaders)())
      .use(createMiddleware(() => middlewares.contextAsync)())
      .handle(createHandler(throwEarlyAndLateHandler)()),
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
    return c.notFound();
  }),
);

const port = args.port ? Number.parseInt(args.port, 10) : 3000;

if (deno) {
  // @ts-expect-error
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
