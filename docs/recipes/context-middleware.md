# Updating the Context

In this example, we're creating a middleware that adds a `hello` property to the [context](/definitions#context).
This property will then be accessible to any subsequent middleware or handler.

<<< @/../examples/tool/src/middlewares/context.middleware.ts {ts twoslash}

After bundling this middleware, one can then use this middleware as follows:

::: code-group

```ts twoslash [express.ts]
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-express";
import express from "express";
import { getContext } from "@universal-middleware/express";

const app = express();

// Now the universal context contains `{ hello: "world" }`.
app.use(contextMiddleware("world"));

app.get("/", (req, res) => {
  // The universal context can be retrieved through `getContext` helper
  // outside of universal middlewares and handlers
  const universalCtx = getContext<{ hello: string }>(req);
  res.send(`Hello ${universalCtx.hello}`);
});

export default app;
```

```ts twoslash [hono.ts]
import { Hono } from "hono";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-hono";
import { getContext } from "@universal-middleware/hono";

const app = new Hono();

// Now the universal context contains `{ hello: "world" }`
app.use(contextMiddleware("world"));

app.get("/", (honoCtx) => {
  // The universal context can be retrieved through `getContext` helper
  // outside of universal middlewares and handlers
  const universalCtx = getContext<{ hello: string }>(honoCtx);
  return new Response(`Hello ${universalCtx.hello}`);
});

export default app;
```

```ts twoslash [fastify.ts]
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-fastify";
import fastify from "fastify";
import { getContext } from "@universal-middleware/fastify";

const app = fastify();

// Now the universal context contains `{ hello: "world" }`.
app.register(contextMiddleware("world"));

app.get("/", (req, reply) => {
  // The universal context can be retrieved through `getContext` helper
  // outside of universal middlewares and handlers
  const universalCtx = getContext<{ hello: string }>(req);
  reply.send(`Hello ${universalCtx.hello}`);
});

export default app;
```

```ts twoslash [cloudflare-worker.ts]
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware";
import { createHandler } from "@universal-middleware/cloudflare";
import { pipe } from "@universal-middleware/core";

// Cloudflare Workers has no internal way of representing a middleware
// Instead, we use the universal `pipe` operator
const wrapped = pipe(
  contextMiddleware("world"),
  (request: Request, context: Universal.Context) => {
    return new Response(`Hello ${context.hello}`);
  }
);

export default createHandler(() => wrapped)();
```

```ts [cloudflare-pages]
// functions/index.ts
import { getContext } from "@universal-middleware/cloudflare";

export const onRequest = (request, env, ctx) => {
  const universalCtx = getContext<{ hello: string }>(env);
  return new Response(`Hello ${universalCtx.hello}`);
};

// functions/_middlewares.ts
// See https://developers.cloudflare.com/pages/functions/middleware/

import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-cloudflare-pages";

export const onRequest = contextMiddleware("world");
```

```ts twoslash [vercel-edge.ts]
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware";
import { createEdgeHandler } from "@universal-middleware/vercel";
import { pipe } from "@universal-middleware/core";

// Vercel has no internal way of representing a middleware
// Instead, we use the universal `pipe` operator
const wrapped = pipe(
  contextMiddleware("world"),
  (request: Request, context: Universal.Context) => {
    return new Response(`Hello ${context.hello}`);
  }
);

export const GET = createEdgeHandler(() => wrapped)();
```

```ts twoslash [vercel-node.ts]
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware";
import { createNodeHandler } from "@universal-middleware/vercel";
import { pipe } from "@universal-middleware/core";

// Vercel has no internal way of representing a middleware
// Instead, we use the universal `pipe` operator
const wrapped = pipe(
  contextMiddleware("world"),
  (request: Request, context: Universal.Context) => {
    return new Response(`Hello ${context.hello}`);
  }
);

export default createNodeHandler(() => wrapped)();
```

```ts twoslash [h3.ts]
import { createApp, createRouter, defineEventHandler } from "h3";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-h3";
import { getContext, universalOnBeforeResponse } from "@universal-middleware/h3";

const app = createApp({
  // /!\ This is required for universal-middleware to operate properly
  onBeforeResponse: universalOnBeforeResponse,
});

// Now the universal context contains `{ hello: "world" }`.
app.use(contextMiddleware("world"));

const router = createRouter();

router.get("/", defineEventHandler((event) => {
  // The universal context can be retrieved through `getContext` helper
  // outside of universal middlewares and handlers
  const universalCtx = getContext<{ hello: string }>(event);
  
  return `Hello ${universalCtx.hello}`;
}));

app.use(router);

export default app;
```

```ts twoslash [elysia.ts]
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-elysia";
import Elysia from "elysia";

const app = new Elysia()
  // Now the universal context contains `{ hello: "world" }`.
  .use(contextMiddleware("world"))
  .get("/", ({ getContext }) => {
    // The universal context can be retrieved through `getContext` helper
    // outside of universal middlewares and handlers
    const universalCtx = getContext();
    
    return `Hello ${universalCtx.hello}`;
  });

export default app;
```

```ts twoslash [hattip.ts]
import { createRouter } from "@hattip/router";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-hattip";
import { getContext } from "@universal-middleware/hattip";

const app = createRouter();

// Now the universal context contains `{ hello: "world" }`.
app.use(contextMiddleware("world"));

app.get("/", (honoCtx) => {
  // The universal context can be retrieved through `getContext` helper
  // outside of universal middlewares and handlers
  const universalCtx = getContext<{ hello: string }>(honoCtx);
  return new Response(`Hello ${universalCtx.hello}`);
});

const hattipHandler = app.buildHandler();

export default hattipHandler;
```

:::
