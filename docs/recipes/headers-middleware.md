# Updating the Headers

The following middleware demonstrate how to interact with or modify a Response.

> [!NOTE]
> Contrary to some middleware patterns out there, universal middlewares do not use a `next()` function. 
> Instead, a middleware can return a function that will take the response as its first parameter.

<<< @/../examples/tool/src/middlewares/headers.middleware.ts

After bundling and publishing this middleware, one can then use this middleware as follows:

::: code-group

<<< @/../tests-examples/tests-tool/src/hono-entry.ts

<<< @/../tests-examples/tests-tool/src/h3-entry.ts

<<< @/../tests-examples/tests-tool/src/hattip-entry.ts

<<< @/../tests-examples/tests-tool/src/cloudflare-worker-entry.ts

```ts [cloudflare-pages]
// functions/index.ts

import handler from "@universal-middleware-examples/tool/dummy-handler-cloudflare-pages";

export const onRequest = handler();

// functions/_middlewares.ts
// See https://developers.cloudflare.com/pages/functions/middleware/

import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-cloudflare-pages";
import headersMiddleware from "@universal-middleware-examples/tool/middlewares/headers-middleware-cloudflare-pages";

export const onRequest = [contextMiddleware("World!!!"), headersMiddleware()];
```

<<< @/../tests-examples/tests-tool/src/express-entry.ts

<<< @/../tests-examples/tests-tool/src/fastify-entry.ts

:::
