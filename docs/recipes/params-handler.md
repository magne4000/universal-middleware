# Using route parameters

Most adapters natively support route parameters (also called _parametric path_ or _path parameters_) such as `/hello/:name`.
`@universal-middleware/core` provides the `params` helper to universally retrieve those.

We recommend to follow this next example when using route parameters:

<<< @/../examples/tool/src/handlers/params.handler.ts {ts twoslash}

> [!NOTE]
> For servers supporting route parameters (`app.get("/user/:name", myHandler())`), the parameters are available under `runtime.params`.
> 
> For other adapters (`app.get("/user/*", myHandler({ route: "/user/:name" }))`), the 3rd argument of `params` helper must be present and not _undefined_.
> Then parameters are extracted with [regexparam](https://github.com/lukeed/regexparam).

After bundling this middleware, one can then use this middleware as follows:

::: code-group

```ts twoslash [express.ts]
import paramHandler from "@universal-middleware-examples/tool/params-handler-express";
import express from "express";

const app = express();

app.get("/user/:name", paramHandler());

export default app;
```

```ts twoslash [hono.ts]
import { Hono } from "hono";
import paramHandler from "@universal-middleware-examples/tool/params-handler-hono";

const app = new Hono();

app.get("/user/:name", paramHandler());

export default app;
```

```ts twoslash [fastify.ts]
import paramHandler from "@universal-middleware-examples/tool/params-handler-fastify";
import fastify from "fastify";

const app = fastify();

app.get("/user/:name", paramHandler());

export default app;
```

```ts twoslash [srvx.ts]
import paramHandler from "@universal-middleware-examples/tool/params-handler-srvx";
import { serve } from "srvx";
import { apply } from "@universal-middleware/srvx";

const server = serve({
  port: 3000,
  fetch: apply([
    paramHandler({
      route: "/user/:name",
    })
  ])
});

export default server;
```

```ts [cloudflare-worker.ts]
import paramsHandler from "@universal-middleware-examples/tool/params-handler";
import { createHandler } from "@universal-middleware/cloudflare";
import { pipe, type RuntimeAdapter } from "@universal-middleware/core";

const paramsHandlerInstance = paramsHandler({
  // Mandatory when targeting Cloudflare Worker
  route: "/user/:name",
});

// Cloudflare Workers have no native routing support.
// We recommend using Hono as it fully supports Cloudflare Worker.
const wrapped = pipe(
  (request: Request, ctx: Universal.Context, runtime: RuntimeAdapter) => {
    const url = new URL(request.url);
    // intercept `/user/*` routes with this handler
    if (url.pathname.startsWith("/user/")) {
      return paramsHandlerInstance(request, ctx, runtime);
    }
  },
  // Other handlers
);

export default createHandler(() => wrapped)();
```

```ts twoslash [cloudflare-pages.ts]
// functions/user/[name].ts

import paramHandler from "@universal-middleware-examples/tool/params-handler-cloudflare-pages";

export const onRequest = paramHandler();
```

```ts twoslash [vercel-node.ts]
// api/user/[name].ts

import paramHandler from "@universal-middleware-examples/tool/params-handler-vercel-node";

export default paramHandler();
```

```ts twoslash [vercel-edge.ts]
// api/user/[name].ts

import paramHandler from "@universal-middleware-examples/tool/params-handler-vercel-edge";

export const GET = paramHandler();
```

```ts twoslash [h3.ts]
import { createApp, createRouter } from "h3";
import paramHandler from "@universal-middleware-examples/tool/params-handler-h3";
import { universalOnBeforeResponse } from "@universal-middleware/h3";

const app = createApp({
  // /!\ This is required for universal-middleware to operate properly
  onBeforeResponse: universalOnBeforeResponse,
});

const router = createRouter();

router.get("/user/:name", paramHandler());

app.use(router);

export default app;
```

```ts twoslash [elysia.ts]
import paramHandler from "@universal-middleware-examples/tool/params-handler-elysia";
import Elysia from "elysia";

const app = new Elysia().get("/user/:name", paramHandler());

export default app;
```

```ts twoslash [hattip.ts]
import { createRouter } from "@hattip/router";
import paramHandler from "@universal-middleware-examples/tool/params-handler-hattip";

const app = createRouter();

app.get("/user/:name", paramHandler());

const hattipHandler = app.buildHandler();

export default hattipHandler;
```

:::
