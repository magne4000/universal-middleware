# Sirv

`@universal-middleware/sirv` is a port of [sirv](https://www.npmjs.com/package/sirv) to universal-middleware.

`sirv` describes itself as follows:
> The optimized and lightweight middleware for serving requests to static assets

> [!NOTE]
> No support for **Cloudflare** or **Vercel**, as they have their own way to handle static files.

## Usage

```ts twoslash
import sirv from "@universal-middleware/sirv/hono";
import { Hono } from "hono";

const app = new Hono();

app.use(sirv('public', {
  // Documentation regarding options can be found at
  // https://github.com/lukeed/sirv/tree/main/packages/sirv#api
}));

// ...

export default app;

```
