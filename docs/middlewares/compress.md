# Compress

`@universal-middleware/compress` provides compression capabilities for `Response` body.

> [!NOTE]
> No support for **Cloudflare** adapter, as Cloudflare compresses responses by default.

## Usage

```ts twoslash
import compress from "@universal-middleware/compress/hono";
import { Hono } from "hono";

const app = new Hono();

app.use(compress({
  // optional configs
  threshold: 1024, // will not compress data if body length is below threshold
}));

// ...

export default app;

```

## With `apply()`

`compress()` declares `order: MiddlewareOrder.RESPONSE_COMPRESSION`. With `apply()` or `pipe()`, it runs once a `Response` exists, wherever it is listed: it compresses the handler's response or the answer of an earlier middleware, such as a file `sirv()` serves, after the response transforms (a lower `order`) edited the body.

```ts
import compress from "@universal-middleware/compress";
import sirv from "@universal-middleware/sirv";
import { apply } from "@universal-middleware/hono";
import { Hono } from "hono";

const app = new Hono();

// The files sirv() serves are compressed too
apply(app, [sirv("public"), compress()]);
```

Registered one by one with the server (`app.use()`), middlewares run in the order they are registered: register a middleware that rewrites the body before `compress()`.
