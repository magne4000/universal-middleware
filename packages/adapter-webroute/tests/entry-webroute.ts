import { args, bun, deno } from "@universal-middleware/tests";
import {
  guarded,
  handler,
  middlewares,
  routeParamHandler,
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
  Route.normalise(route("/user/:name").method("get").handle(createHandler(routeParamHandler)())),
  // @ts-ignore
  Route.normalise(
    route("/")
      .method("get")
      // `createMiddleware(m1)()` or `m1()` are roughly equivalent is some cases (if not using the context or runtime).
      // Usually prefer wrapping in `createMiddleware` for better compatibility
      .use(middlewares.contextSync)
      .use(createMiddleware(() => middlewares.updateHeaders)())
      .use(createMiddleware(() => middlewares.contextAsync)())
      .handle(createHandler(handler)()),
  ),
  // @ts-ignore
  Route.normalise(
    route("/guarded")
      .method("get")
      .use(middlewares.guard)
      .use(middlewares.contextSync)
      .use(createMiddleware(() => middlewares.updateHeaders)())
      .use(createMiddleware(() => middlewares.contextAsync)())
      .handle(createHandler(guarded)()),
  ),
  // @ts-ignore
  Route.normalise(
    route("/throw-early")
      .method("get")
      .use(middlewares.throwEarly)
      .use(middlewares.contextSync)
      .use(createMiddleware(() => middlewares.updateHeaders)())
      .use(createMiddleware(() => middlewares.contextAsync)())
      .handle(createHandler(throwEarlyHandler)()),
  ),
  // @ts-ignore
  Route.normalise(
    route("/throw-late")
      .method("get")
      .use(middlewares.throwLate)
      .use(middlewares.contextSync)
      .use(createMiddleware(() => middlewares.updateHeaders)())
      .use(createMiddleware(() => middlewares.contextAsync)())
      .handle(createHandler(throwLateHandler)()),
  ),
  // @ts-ignore
  Route.normalise(
    route("/throw-early-and-late")
      .method("get")
      .use(middlewares.throwEarly)
      .use(middlewares.throwLate)
      .use(middlewares.contextSync)
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
