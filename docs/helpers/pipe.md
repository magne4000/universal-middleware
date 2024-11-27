# Pipe
The `pipe` functions composes a sequence of middlewares into a single middleware.
It takes an array of middleware functions and returns a new middleware function that
applies the input middleware functions in sequence to a given request and context.

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
}) satisfies Get<[], UniversalMiddleware>;

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

You can also `pipe` middlewares or handlers that are adapter specific:

> [!WARNING]
> This is only valid for middlewares and handlers generated thanks to `universal-middleware`

```ts twoslash
// @include: main
// ---cut---
import { createMiddleware } from "@universal-middleware/hono";

const honoMiddlewareStatus = createMiddleware(middlewareStatus);

const newHandler = pipe(honoMiddlewareStatus(), middlewareEarlyResponseError(), handler())
```

```ts twoslash
// @include: main
// ---cut---
import { createHandler } from "@universal-middleware/hono";

const honoHandler = createHandler(handler);

const newHandler = pipe(middlewareStatus(), middlewareEarlyResponseError(), honoHandler())
```
