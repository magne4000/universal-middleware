import type { Get, UniversalMiddleware } from "@universal-middleware/core";
import { args, bun, deno } from "@universal-middleware/tests";
import { handler, middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { createHandler, createMiddleware } from "../src/index.js";

const app = new Hono();

// standard Hono middleware
app.use(secureHeaders());

for (const middleware of middlewares) {
  app.use(createMiddleware(middleware as Get<[], UniversalMiddleware>)());
}

// route params handler
app.get("/user/:name", createHandler(routeParamHandler)());

// universal handler
app.get("/", createHandler(handler)());

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
