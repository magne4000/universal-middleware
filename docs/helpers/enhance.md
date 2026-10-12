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
  path: "/",     // rou3 v0.12 pattern syntax, close to URLPattern. See https://github.com/h3js/rou3
  
  // The order and runs properties are specific to Middleware configuration
  // order: 10,  // Positive values run AFTER handlers, negative values BEFORE. See "Order and early responses" below
  // runs: "always", // Overrides when the middleware runs, see below
})) satisfies Get<[], UniversalHandler>;
```

### apply
The `apply` function is a helper exported by most adapters that:
- Reads metadata from _enhanced_ middlewares/handlers (path, method, order)
- Automatically registers them with the framework-specific router in the correct order
- Handles route registration based on the `path` and `method` metadata
- Manages middleware sequencing based on the `order` property (negative orders run before handlers, positive after), and runs the same way on every adapter, see [Order and early responses](#order-and-early-responses)
- Runs a middleware that has a `path` only for the requests a route with the same `path` (and `method`, if set) would match

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
// @noErrors
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
// @noErrors
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

Code that runs middlewares itself can apply the same check with `createMatcher(path, method)`, for instance against a URL it rewrote:

```ts
import { createMatcher } from "@universal-middleware/core";

const isMatch = createMatcher("/admin/**", "GET");

isMatch(new Request("http://localhost/admin/settings")); // true
isMatch(new Request("http://localhost/admin/settings", { method: "HEAD" })); // true, a GET route also matches HEAD
isMatch(new Request("http://localhost/about")); // false
```

### Order and early responses

`apply` sorts middlewares by `order` (no `order` counts as `0`; equal orders keep their list position), and registers each of them with the server. A middleware that returns a `Response` answers the request. What runs then depends on `runs`, which `order` sets by default:

| `runs`                                     | When the middleware runs                                                                                    |
|--------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| `"until-response"` (default for `order` ≤ 0) | At its place in the list, and not once a `Response` exists                                                  |
| `"after-response"` (default for `order` > 0) | Once a `Response` exists: after the handler, or right after an earlier middleware answered. Returning a `Response` from it throws: it acts through a response function |
| `"always"`                                   | At its place in the list, whether a `Response` exists or not. The first `Response` answers, a later one is ignored |

Every response function then applies to the answer, in order.

```ts
apply(app, [
  enhance(auth, { order: MiddlewareOrder.AUTHENTICATION }), // answers 401 without a session
  logRequest, // no order: doesn't run once `auth` answered
  enhance(compress(), { order: MiddlewareOrder.RESPONSE_COMPRESSION }), // compresses the 401 too
  handler,
]);
```

> [!NOTE]
> A middleware with a positive `order` runs after the handler: a context it returns doesn't reach the handler. A middleware that must run before the handler, like a cache that answers hits (`MiddlewareOrder.CACHING`) or a logger that times the handler, needs a negative `order`.

`MiddlewareOrder` lists the usual slots, in the order they run: `CORS` first, so that its headers also reach an early 401 or 429, then rate limiting, authentication, authorization, caching, parsing and input validation before the handler; error pages, response transforms, headers, compression, conditional requests and logging after it.

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
