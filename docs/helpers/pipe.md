# Pipe
The `pipe` function combines multiple middleware into one.
It takes an array of middleware and returns a new middleware that processes a request and context
through each middleware in sequence.

## Usage

Let's start with the following middlewares and handlers:

```ts twoslash include main
import { env, type Get, type UniversalMiddleware, type UniversalHandler } from "@universal-middleware/core";
import { pipe } from "@universal-middleware/core";
// ---cut---
const middlewareStatus = (() => (request, context, runtime) => {
  return { status: 'OK' };
}) satisfies Get<[], UniversalMiddleware>;

const middlewareEarlyResponseError = (() => (request, context, runtime) => {
  if (context.status && context.status !== 'OK') {
    return new Response("Error", { status: 500 });
  }
}) satisfies Get<[], UniversalMiddleware<{ status?: string }>>;

const handler = (() => (request, context, runtime) => {
  return new Response(context.status ?? "OK");
}) satisfies Get<[], UniversalHandler<{ status?: string }>>;
```

You can `pipe` universal middlewares together, creating a new middleware that combines their behavior:
```ts twoslash
// @include: main
// ---cut---
const newMiddleware = pipe(middlewareStatus(), middlewareEarlyResponseError())
```

You can also `pipe` universal middlewares and handlers together, creating a new handler that combines their behavior:
```ts twoslash
// @include: main
// ---cut---
const newHandler = pipe(middlewareStatus(), middlewareEarlyResponseError(), handler())
```

You can also `pipe` middlewares or handlers that are adapter specific.

Any adapter specific middleware will act as if they were universal:
```ts twoslash
// @include: main
// ---cut---
import { createMiddleware } from "@universal-middleware/hono";

const honoMiddlewareStatus = createMiddleware(middlewareStatus);

const newHandler = pipe(honoMiddlewareStatus(), middlewareEarlyResponseError(), handler())
//    ^^^^^^^^^^
//    ^ `newHandler` is a universal handler because `handler` is universal
```

Any adapter specific handler will keep their signature once returned:
```ts twoslash
// @include: main
// ---cut---
import { createHandler } from "@universal-middleware/hono";

const honoHandler = createHandler(handler);

const newHonoHandler = pipe(middlewareStatus(), middlewareEarlyResponseError(), honoHandler())
//    ^^^^^^^^^^^^^^
//    ^ `newHonoHandler` is a hono handler because `honoHandler` is hono-specific
// It can directly be used by hono: app.get("/", newHonoHandler);
```

> [!WARNING]
> This is only valid for middlewares and handlers generated thanks to `universal-middleware`
