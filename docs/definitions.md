# Definitions

## Handler
A function that returns a [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response).

It will usually be associated with a _route_.

```ts twoslash
import type { RuntimeAdapter } from "@universal-middleware/core";
// ---cut---
interface UniversalHandler<Context> {
  (request: Request, context: Context, runtime: RuntimeAdapter):
    Response | Promise<Response>;
}
```

> [!NOTE]
> In some frameworks, a Response can be anything from a web Response, a string, an object, a ServerResponse, etc.
> Only web Response are supported by `universal-middleware`, as this is part of the [WinterCG standard](https://fetch.spec.wintercg.org/#responses).

## Middleware
A function that alters the [Context](#context) or Response. Can also return an early Response.

It will usually _NOT_ be associated with a _route_.

Check the [recipes](/recipes/context-middleware) for details.

```ts twoslash
type Awaitable<T> = T | Promise<T>;
import type { RuntimeAdapter } from "@universal-middleware/core";
// ---cut---
interface UniversalMiddleware<InContext, OutContext> {
  (request: Request, context: InContext, runtime: RuntimeAdapter):
    Awaitable<
    | Response // Can return an early Response
    | OutContext // Can return a new context. Ensures type-safe context representation
    | ((response: Response) => Awaitable<Response>) // Can return a function that manipulates the Response
    | void | undefined // Can return nothing
    >;
}
```

## Context
Some data, usually added by a middleware, with the same lifespan as a Request.

For instance, a `{ user: User }` context can be set by a middleware, then accessed by others.

> [!NOTE]
> Each framework has its own way to attach data related to the request,
> either by attaching values to their internal request representation (like Express),
> or by having their own context encapsulating the request (like Hono).
> 
> _On the other hand, a universal context is just an object, detached from the request,
> but with the same lifespan._

> [!TIP]
> Each adapter provides a `getContext` helper to retrieve the universal context
> from any non-universal middleware or handler.

> [!TIP]
> One can also override the global `Universal.Context`, making it visible to all Universal Middlewares.
> ```ts
> import { User } from 'my-lib';
> 
> declare global {
>   namespace Universal {
>     interface Context {
>       user: User;
>     }
>   }
> }
> ```

