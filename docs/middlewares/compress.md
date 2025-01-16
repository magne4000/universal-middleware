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
