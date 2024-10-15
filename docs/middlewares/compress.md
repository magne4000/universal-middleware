# Compress

`@universal-middleware/compress` provides compression capabilities for `Response` body.

> [!NOTE]
> **Cloudflare** middlewares are not generated, as Cloudflare compresses responses by default.

> [!NOTE]
> **Elysia** middleware does not compress right now as Bun lacks support for `CompressionStream`

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
