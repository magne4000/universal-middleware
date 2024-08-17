import { createHandler, createMiddleware } from "../src/index.js";
import { Hono, type MiddlewareHandler } from "hono";
import { secureHeaders } from "hono/secure-headers";
import {
  args,
  bun,
  deno,
  handler,
  middlewares,
} from "@universal-middleware/tests";
import { route } from "@webroute/route";
import { type MiddlewareFactoryDataResult } from "../src/common.js";
import { createAdapter } from "@webroute/middleware";

const app = new Hono();

const m1 = middlewares[0];
const m2 = middlewares[1];
const m3 = middlewares[2];

type M1 = MiddlewareFactoryDataResult<typeof m1>;
type M3 = MiddlewareFactoryDataResult<typeof m3>;

const router = route()
  // `createMiddleware(m1)()` or `m1()` should roughly be equivelant. The former allows better control over typings
  .use(m1())
  .use((_request, ctx) => {
    console.log("something BEFORE", ctx.state.something);
  })
  .use(createMiddleware<[], M1, M1>(m2)())
  .use(createMiddleware<[], M1, M3>(m3)())
  .use((_request, ctx) => {
    console.log("something", ctx.state.something);
    console.log("somethingElse", ctx.state.somethingElse);
  })
  .handle(createHandler(handler)());

// standard Hono middleware
app.use(secureHeaders());

const toHono = createAdapter<MiddlewareHandler>((c, next) => {
  return {
    async onData(data) {
      c.set("state", { ...c.get("state"), ...data });
      next();
    },
    async onEmpty() {
      next();
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
    return router(c.req.raw);
  }),
);

const port = args.port ? parseInt(args.port) : 3000;

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
