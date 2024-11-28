# `universal-middleware`

Write middlewares and handlers once, target
[Hono](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-hono),
[Express](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-express),
[Cloudflare](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-cloudflare),
[Hattip](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-hattip),
[Webroute](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-webroute),
[Fastify](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-fastify),
[h3](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-h3),
[Elysia](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-elysia)
[Vercel](https://github.com/magne4000/universal-middleware/tree/main/packages/adapter-vercel)
, (and more on the way!).

## Documentation

Learn more on the [Documentation](https://universal-middleware.dev/)

## Code example

A middleware that returns an early response if some header is missing.
```ts
// src/middlewares/demo.middleware.ts

import type { Get, UniversalMiddleware } from "@universal-middleware/core";

interface Config {
  header: string;
}

// This middleware will return an early response if given header is missing
const guardMiddleware = ((config) => (request, ctx) => {
  if (!request.headers.has(config.header)) {
    return new Response("Header not present", {
      status: 401,
    });
  }
  // else we do nothing

  // Using `satisfies` to not lose return type
}) satisfies Get<[Config], UniversalMiddleware>;

// export default is mandatory
export default guardMiddleware;
```

After bundling and publishing, this would be used like this:
```ts
// hono-entry.ts

import { Hono } from "hono";
// hattip users would use "some-lib/middlewares/demo-middleware-hattip"
// express users would use "some-lib/middlewares/demo-middleware-express"
// etc.
import demoMiddleware from "some-lib/middlewares/demo-middleware-hono";

const app = new Hono();

app.use(demoMiddleware({ header: 'X-Universal-Demo' }));
app.get("/", () => new Response('ok')));

export default app;
```
