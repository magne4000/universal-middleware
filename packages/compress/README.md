# `@universal-middleware/compress`

Compresses `Response` bodies (gzip, deflate, brotli where available), as a universal middleware for Hono, Express, Hattip, Fastify, h3, srvx, Webroute and Elysia.

```ts
import compress from "@universal-middleware/compress/hono";
import { Hono } from "hono";

const app = new Hono();

// Bodies below `threshold` bytes (1024 by default) are not compressed
app.use(compress({ threshold: 1024 }));

export default app;
```

See the [documentation](https://universal-middleware.dev/middlewares/compress).
