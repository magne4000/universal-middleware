# Updating the Context

In this example, we're creating a middleware that adds a `hello` property to the context.
This property will then be accessible to any subsequent middleware or handler.

```ts twoslash
// src/middlewares/context.middleware.ts
import type { Get, UniversalMiddleware } from "universal-middleware";

const contextMiddleware = ((value) => (request, ctx) => {
  // Return the new universal context, thus keeping complete type safety
  // A less typesafe way to do the same thing would be to `ctx.something = value` and return nothing
  return {
    ...ctx,
    hello: value,
  };
  // Using `satisfies` to not lose return type
}) satisfies Get<[string], UniversalMiddleware>;

// export default is mandatory
export default contextMiddleware;
```

After bundling and publishing this middleware, a Hono user could then use this middleware like this:
```ts twoslash
//hono-entry.ts
import { Hono } from "hono";
import contextMiddleware from "@universal-middleware-examples/tool/middlewares/context-middleware-hono";
import { getContext } from "@universal-middleware/hono";

const app = new Hono();

// Now the universal context contains `{ hello: "world" }`
app.use(contextMiddleware("world"));

app.get("/", (honoCtx) => {
  // The universal context can be retrieved through `getContext` helper
  // outside of universal middlewares and handlers
  const universalCtx = getContext<{ hello: string }>(honoCtx)!;
  return new Response(`Hello ${universalCtx.hello}`);
});

export default app;
```
