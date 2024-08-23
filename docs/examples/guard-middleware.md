# Return an early response

The following middleware is in charge of returning an early Response in case of unauthenticated user access.

<<< @/../examples/tool/src/middlewares/guard.middleware.ts

After bundling and publishing this middleware, one can then use this middleware as follows:

::: code-group

```ts twoslash [hono-entry.ts]
import { Hono } from "hono";
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware-hono";

const app = new Hono();

app.use(guardMiddleware());

export default app;
```

```ts twoslash [h3-entry.ts]
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

```ts twoslash [hattip-entry.ts]
import { createRouter } from "@hattip/router";
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware-hattip";

const app = createRouter();

app.use(guardMiddleware());

const hattipHandler = app.buildHandler();

export default hattipHandler;
```

```ts twoslash [express-entry.ts]
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware-express";
import express from "express";

const app = express();

app.use(guardMiddleware());

export default app;
```

```ts twoslash [fastify-entry.ts]
import guardMiddleware from "@universal-middleware-examples/tool/middlewares/guard-middleware-fastify";
import fastify from "fastify";

const app = fastify();

app.register(guardMiddleware());

export default app;
```

:::
