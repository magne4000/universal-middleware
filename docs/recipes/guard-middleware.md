# Return an early response

The following middleware is in charge of returning an early Response in case of unauthenticated user access.

<<< @/../examples/tool/src/middlewares/guard.middleware.ts {ts twoslash}

After bundling this middleware, one can then use this middleware as follows:

::: code-group

```ts twoslash [express.ts]
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware-express";
import express from "express";

const app = express();

app.use(guardMiddleware());

export default app;
```

```ts twoslash [hono.ts]
import { Hono } from "hono";
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware-hono";

const app = new Hono();

app.use(guardMiddleware());

export default app;
```

```ts twoslash [fastify.ts]
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware-fastify";
import fastify from "fastify";

const app = fastify();

app.register(guardMiddleware());

export default app;
```

```ts twoslash [cloudflare-worker.ts]
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware";
import { createHandler } from "@universal-middleware/cloudflare";
import { pipe } from "@universal-middleware/core";

// Cloudflare Workers have no internal way of representing a middleware
// Instead, we use the universal `pipe` operator
const wrapped = pipe(
  guardMiddleware(),
  () => {
    return new Response("OK");
  }
);

export default createHandler(() => wrapped)();
```

```ts twoslash [cloudflare-pages]
// functions/_middlewares.ts
// See https://developers.cloudflare.com/pages/functions/middleware/

import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware-cloudflare-pages";

export const onRequest = guardMiddleware();
```

```ts twoslash [vercel-edge.ts]
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware";
import { createEdgeHandler } from "@universal-middleware/vercel/edge";
import { pipe } from "@universal-middleware/core";

// Vercel has no internal way of representing a middleware
// Instead, we use the universal `pipe` operator
const wrapped = pipe(
  guardMiddleware(),
  () => {
    return new Response("OK");
  }
);

export const GET = createEdgeHandler(() => wrapped)();
```

```ts twoslash [vercel-node.ts]
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware";
import { createNodeHandler } from "@universal-middleware/vercel/node";
import { pipe } from "@universal-middleware/core";

// Vercel has no internal way of representing a middleware
// Instead, we use the universal `pipe` operator
const wrapped = pipe(
  guardMiddleware(),
  () => {
    return new Response("OK");
  }
);

export default createNodeHandler(() => wrapped)();
```

```ts twoslash [h3.ts]
import { createApp } from "h3";
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware-h3";
import { universalOnBeforeResponse } from "@universal-middleware/h3";

const app = createApp({
  // /!\ This is required for universal-middleware to operate properly
  onBeforeResponse: universalOnBeforeResponse,
});

app.use(guardMiddleware());

export default app;
```

```ts twoslash [elysia.ts]
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware-elysia";
import Elysia from "elysia";

const app = new Elysia().use(guardMiddleware());

export default app;
```

```ts twoslash [hattip.ts]
import { createRouter } from "@hattip/router";
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware-hattip";

const app = createRouter();

app.use(guardMiddleware());

const hattipHandler = app.buildHandler();

export default hattipHandler;
```

:::
