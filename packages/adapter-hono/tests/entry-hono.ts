import { createHandler, createMiddleware } from "../src/index.js";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import {
  args,
  bun,
  deno,
  handler,
  middlewares,
} from "@universal-middleware/tests";
import type { Get, UniversalMiddleware } from "@universal-middleware/core";

const app = new Hono();

// standard Hono middleware
app.use(secureHeaders());

middlewares.forEach((middleware) =>
  app.use(createMiddleware(middleware as Get<[], UniversalMiddleware>)()),
);

// universal handler
app.get("/", createHandler(handler)());

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
