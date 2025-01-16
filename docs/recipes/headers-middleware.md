# Updating the Headers

The following middleware demonstrate how to interact with or modify a Response.

> [!NOTE]
> Contrary to some middleware patterns out there, universal middlewares does not use a `next()` function. 
> Instead, a middleware can return a function that will take the response as its first parameter.

<<< @/../examples/tool/src/middlewares/headers.middleware.ts {ts twoslash}

After bundling this middleware, one can then use this middleware as follows:

::: code-group

<<< @/../tests-examples/tests-tool/src/express-entry.ts [express.ts]

<<< @/../tests-examples/tests-tool/src/hono-entry.ts [hono.ts]

<<< @/../tests-examples/tests-tool/src/fastify-entry.ts [fastify.ts]

<<< @/../tests-examples/tests-tool/src/cloudflare-worker-entry.ts [cloudflare-worker.ts]

```ts [cloudflare-pages.ts]
// functions/index.ts

import handler from "@universal-middleware-examples/tool/dummy-handler-cloudflare-pages";

export const onRequest = handler();

// functions/_middlewares.ts
// See https://developers.cloudflare.com/pages/functions/middleware/

import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-cloudflare-pages";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-cloudflare-pages";

export const onRequest = [contextMiddleware("World!!!"), headersMiddleware()];
```

<<< @/../tests-examples/tests-tool/api/node/index.ts [vercel-node.ts]

<<< @/../tests-examples/tests-tool/api/web/index.ts [vercel-edge.ts]

<<< @/../tests-examples/tests-tool/src/h3-entry.ts [h3.ts]

<<< @/../tests-examples/tests-tool/src/elysia-entry.ts [elysia.ts]

<<< @/../tests-examples/tests-tool/src/hattip-entry.ts [hattip.ts]

:::
