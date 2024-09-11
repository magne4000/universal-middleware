# Using route parameters

Most adapters natively support route parameters (also called _parametric path_ or _path parameters_) such as `/hello/:name`.
`@universal-middleware/core` provides the `params` helper to universally retrieve those.

We recommend to follow this next example when using route parameters:

```ts twoslash
// src/handlers/params.handler.ts

import { params, type UniversalHandler } from "@universal-middleware/core";

interface Options {
  route?: string;
}

const myHandler = ((options?) => (request, ctx, runtime) => {
  const myParams = params(request, runtime, options?.route);
    
  if (myParams === null || !myParams.name) {
    // Provide a useful error message to the user
    throw new Error("A route parameter named `:name` is required. " +
    "You can set your server route as `/user/:name`, or use the `route` option of this middleware " +
    "to achieve the same purpose.");
  }
  
  // ...
  return new Response(`User name is: ${myParams.name}`);
}) satisfies ((options?: Options) => UniversalHandler);

export default myHandler;
```

> [!NOTE]
> For servers supporting route parameters (`app.get("/user/:name", myHandler())`), the parameters are available under `runtime.params`.
> 
> For other adapters (`app.get("/user/*", myHandler({ route: "/user/:name" }))`), the 3rd argument of `params` helper must be present and not _undefined_.
> Then parameters are extracted with [regexparam](https://github.com/lukeed/regexparam).

After bundling and publishing this middleware, one can then use this middleware as follows:

::: code-group

```ts [hono.ts]
import { Hono } from "hono";
import paramHandler from "@example/handlers/params-handler-hono";

const app = new Hono();

app.get("/user/:name", paramHandler());

export default app;
```

```ts [h3.ts]
import { createApp } from "h3";
import paramHandler from "@example/handlers/params-handler-h3";
import { universalOnBeforeResponse } from "@universal-middleware/h3";

const app = createApp({
  // /!\ This is required for universal-middleware to operate properly
  onBeforeResponse: universalOnBeforeResponse,
});

app.get("/user/:name", paramHandler());

export default app;
```

```ts [hattip.ts]
import { createRouter } from "@hattip/router";
import paramHandler from "@example/handlers/params-handler-hattip";

const app = createRouter();

app.get("/user/:name", paramHandler());

const hattipHandler = app.buildHandler();

export default hattipHandler;
```

```ts [cloudflare-pages]
// functions/user/[name].ts

import paramHandler from "@example/handlers/params-handler-cloudflare-pages";

export const onRequest = paramHandler();
```

```ts [express.ts]
import paramHandler from "@example/handlers/params-handler-express";
import express from "express";

const app = express();

app.get("/user/:name", guardMiddleware());

export default app;
```

```ts [fastify.ts]
import paramHandler from "@example/handlers/params-handler-fastify";
import fastify from "fastify";

const app = fastify();

app.get("/user/:name", guardMiddleware());

export default app;
```

:::
