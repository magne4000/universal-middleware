# Enhance

The `enhance` helper provides a way to attach metadata to Middlewares and Handlers.
This metadata can include routing information like `path` and `method`, as well as `order` for automatic middleware sequencing.

```ts twoslash include handler
import { type Get, type UniversalHandler, enhance } from "@universal-middleware/core";

// A Universal Handler
const handler = (() => {
  return new Response("My homepage", {
    status: 200,
  });
}) satisfies UniversalHandler;

// Enhance a handler with HTTP method and path metadata
const enhancedHandler = (() => enhance(handler, {
  method: "GET", // Accepts a single method or array of methods: ["GET", "POST", "PATCH"]
  path: "/",     // Respects rou3 syntax. See https://github.com/unjs/rou3
  
  // The order property is specific to Middleware configuration
  // order: 10,  // Positive values execute AFTER handlers in the middleware chain
                 // Negative values execute BEFORE handlers in the middleware chain
})) satisfies Get<[], UniversalHandler>;
```

### apply
The `apply` function is a helper exported by most adapters that:
- Reads metadata from _enhanced_ middlewares/handlers (path, method, order)
- Automatically registers them with the framework-specific router in the correct order
- Handles route registration based on the `path` and `method` metadata
- Manages middleware sequencing based on the `order` property (negative orders run before handlers, positive after)

For example:

::: code-group

```ts twoslash [express.ts]
// @include: handler
// ---cut---
import express from "express";
// ---cut-start---
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware";
// ---cut-end---
import { apply } from "@universal-middleware/express";

const app = express();

apply(app, [
  // Register middleware and handlers in the application
  guardMiddleware(),
  // Each handler requires method and path metadata
  enhancedHandler(),
  // Handlers can be enhanced with different metadata for route variations
  enhance(enhancedHandler(), {
    method: ["GET", "POST"],
    path: "/home"
  })
]);
```

```ts twoslash [hono.ts]
// @include: handler
// ---cut---
import { Hono } from "hono";
// ---cut-start---
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware";
// ---cut-end---
import { apply } from "@universal-middleware/hono";

const app = new Hono();

apply(app, [
  // Register middleware and handlers in the application
  guardMiddleware(),
  // Each handler requires method and path metadata
  enhancedHandler(),
  // Handlers can be enhanced with different metadata for route variations
  enhance(enhancedHandler(), {
    method: ["GET", "POST"],
    path: "/home"
  })
]);
```

```ts twoslash [fastify.ts]
// @include: handler
// ---cut---
import fastify from "fastify";
// ---cut-start---
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware";
// ---cut-end---
import { apply } from "@universal-middleware/fastify";

const app = fastify();

await apply(app, [
  // Register middleware and handlers in the application
  guardMiddleware(),
  // Each handler requires method and path metadata
  enhancedHandler(),
  // Handlers can be enhanced with different metadata for route variations
  enhance(enhancedHandler(), {
    method: ["GET", "POST"],
    path: "/home"
  })
]);
```

```ts twoslash [cloudflare-worker.ts]
// @include: handler
// ---cut---
// ---cut-start---
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware";
// ---cut-end---
import { apply } from "@universal-middleware/cloudflare";

export default apply([
  // Register middleware and handlers in the application
  guardMiddleware(),
  // Each handler requires method and path metadata
  enhancedHandler(),
  // Handlers can be enhanced with different metadata for route variations
  enhance(enhancedHandler(), {
    method: ["GET", "POST"],
    path: "/home"
  })
]);
```

```ts twoslash [h3.ts]
// @include: handler
// ---cut---
import { createApp } from "h3";
// ---cut-start---
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware";
// ---cut-end---
import { apply } from "@universal-middleware/h3";

const app = createApp();

apply(app, [
  // Register middleware and handlers in the application
  guardMiddleware(),
  // Each handler requires method and path metadata
  enhancedHandler(),
  // Handlers can be enhanced with different metadata for route variations
  enhance(enhancedHandler(), {
    method: ["GET", "POST"],
    path: "/home"
  })
]);
```

```ts twoslash [elysia.ts]
// @include: handler
// ---cut---
import { Elysia } from "elysia";
// ---cut-start---
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware";
// ---cut-end---
import { apply } from "@universal-middleware/elysia";

const app = new Elysia();

apply(app, [
  // Register middleware and handlers in the application
  guardMiddleware(),
  // Each handler requires method and path metadata
  enhancedHandler(),
  // Handlers can be enhanced with different metadata for route variations
  enhance(enhancedHandler(), {
    method: ["GET", "POST"],
    path: "/home"
  })
]);
```

```ts twoslash [hattip.ts]
// @include: handler
// ---cut---
import { createRouter } from "@hattip/router";
// ---cut-start---
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware";
// ---cut-end---
import { apply } from "@universal-middleware/hattip";

const app = createRouter();

apply(app, [
  // Register middleware and handlers in the application
  guardMiddleware(),
  // Each handler requires method and path metadata
  enhancedHandler(),
  // Handlers can be enhanced with different metadata for route variations
  enhance(enhancedHandler(), {
    method: ["GET", "POST"],
    path: "/home"
  })
]);

export default app.buildHandler();
```

```ts twoslash [srvx.ts]
// @include: handler
// ---cut---
import { serve } from "srvx";
// ---cut-start---
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware";
// ---cut-end---
import { apply } from "@universal-middleware/srvx";

const server = serve({
  port: 3000,
  fetch: apply([
    // Register middleware and handlers in the application
    guardMiddleware(),
    // Each handler requires method and path metadata
    enhancedHandler(),
    // Handlers can be enhanced with different metadata for route variations
    enhance(enhancedHandler(), {
      method: ["GET", "POST"],
      path: "/home"
    })
  ])
});
```

:::

## Support status

The `apply` method is currently being rolled out across adapters.
Some adapters require additional build-time steps before supporting this feature.
We're actively working on expanding support to all adapters.

| Adapter           |     Supported      |
|-------------------|:------------------:|
| express           | :heavy_check_mark: |
| hono              | :heavy_check_mark: |
| fastify           | :heavy_check_mark: |
| cloudflare-worker | :heavy_check_mark: |
| cloudflare-pages  |        :x:         |
| vercel-edge       |        :x:         |
| vercel-node       |        :x:         |
| h3                | :heavy_check_mark: |
| elysia            | :heavy_check_mark: |
| hattip            | :heavy_check_mark: |
| srvx              | :heavy_check_mark: |
| webroute          |        :x:         |
