# @universal-middleware/srvx

## 0.3.2

### Patch Changes

- d305bf9: A middleware registered on its own (`app.use()`, srvx's `middleware`, webroute's `use()`) that reads the request body no longer leaves none for the middlewares and the route after it.
  Express, Fastify and Elysia already kept it.

## 0.3.1

### Patch Changes

- f663733: A response function can change the headers of a Response that has immutable headers. A route that returned `Response.redirect()` or a `fetch()` response answered 500 `TypeError: immutable` as soon as a response function set or deleted a header, and so did a response function that changed the headers after an earlier one returned such a Response. A response function now gets a copy with the same status, headers and body, with `apply()`, with `pipe()` and with middlewares registered one by one. Express and Fastify already copied a route's Response: there, only the second case failed.
  
  `withMutableHeaders(response)` is exported for adapters: it returns that copy when the headers are immutable, else the Response itself, as it does for `Response.error()`.
- Updated dependencies [f663733]
- Updated dependencies [b4dfd06]
  - @universal-middleware/core@0.7.2

## 0.3.0

### Minor Changes

- 2f40695: With `apply()`, a middleware with an `order` of 0 or less (or none) no longer runs once an earlier middleware answered, as on the other adapters: a middleware listed after an authentication middleware that answers 401 doesn't run for that request.
- 2f40695: With `apply()`, a middleware with a positive `order` (or `runs: "after-response"`) that returns a `Response` fails the request with a `TypeError` naming it. It used to answer on Hono, Express, Fastify, h3, Elysia and HatTip, and was ignored on srvx and Cloudflare. A cache that answers hits needs a negative `order`, such as `MiddlewareOrder.CACHING`.
- 2f40695: `enhance()` takes a `runs` option, and `apply()` follows it the same way on every adapter:
  
  - `"until-response"`, the default for an `order` of 0 or less (or none): at its place in the list, and not once a middleware answered with a `Response`.
  - `"after-response"`, the default for a positive `order`: once a `Response` exists, after the handler or right after an earlier middleware answered. It acts through a response function.
  - `"always"`: at its place in the list, whether a `Response` exists or not. The first `Response` answers, a later one is ignored.
  
  Every response function of the list applies to the answer, in order. Each middleware is still registered with the server as its own middleware.
- 47953b1: Fix: with srvx's `createMiddleware` used without `apply()`, response functions apply in the order their middlewares are registered, as everywhere else. They applied in reverse order, so the same list behaved differently than with `apply()`. Now `[compress(), rewrite]`, where `rewrite` is a middleware whose response function edits the body, hands gzip bytes to `rewrite` on every adapter, so list a body rewrite before `compress()`.
  
  An app that relied on the reverse order sees two or more response functions swap. An srvx middleware registered between them now sees the response before they apply, because they all apply after the rest of the chain.

### Patch Changes

- Updated dependencies [2f40695]
- Updated dependencies [2f40695]
- Updated dependencies [2f40695]
- Updated dependencies [2f40695]
- Updated dependencies [4685d38]
- Updated dependencies [2f40695]
- Updated dependencies [85573be]
- Updated dependencies [85573be]
- Updated dependencies [85573be]
  - @universal-middleware/core@0.7.0

## 0.2.2

### Patch Changes

- aa3d958: When a response function replaces the Response, the body of the replaced one is cancelled, so an endless body (Server-Sent Events, a proxied stream) no longer keeps running. It is left alone when the replacement still reads it (the same stream, `pipeThrough`, `clone()`, `text()`, a wrapper that pulls from it). With Express, a response function no longer makes the adapter keep a second copy of the app's output in memory.
- a67d495: Calling `runtime.ctx.waitUntil()` or `runtime.ctx.passThroughOnException()` on Cloudflare no longer throws `TypeError: Illegal invocation`.
- d1363db: The packages that the published files import, at runtime or only in their types, are declared as peer dependencies: each adapter's framework (optional for type-only packages such as `@cloudflare/workers-types`), and for compress and sirv the frameworks of their per-server entries, all optional. The Vercel adapter no longer installs `@universal-middleware/express`, which it only needs for types; it and the other adapter packages it references are optional peers.
- 967b047: The packages declare `engines.node: ">=22"`, the versions they are built for and tested on. Node 20 reached its end of life in April 2026; package managers now warn when installing on it.
- Updated dependencies [aa3d958]
- Updated dependencies [7d163e4]
- Updated dependencies [967b047]
- Updated dependencies [a8c7d38]
- Updated dependencies [3953127]
- Updated dependencies [6f3d3dc]
- Updated dependencies [eca2954]
  - @universal-middleware/core@0.6.1

## 0.2.1

### Patch Changes

- Updated dependencies [0dc053f]
  - @universal-middleware/core@0.6.0

## 0.2.0

### Minor Changes

- 627168a: feat!: routes registered with `apply()` follow rou3 v0.12 through `@universal-middleware/core` 0.5, which aligns them with URLPattern: `*` matches the rest of the path, a bare `**` sets `runtime.params["0"]`, a `-` ends a param name, only one trailing slash is ignored, and a route holds at most one catch-all. See the core 0.5.0 changelog.

## 0.1.4

### Patch Changes

- Updated dependencies [10e6e5f]
- Updated dependencies [6bb65ff]
  - @universal-middleware/core@0.5.0

## 0.1.3

### Patch Changes

- 636b4bc: fix: apply typings to allow more lenient middleware types
- Updated dependencies [636b4bc]
  - @universal-middleware/core@0.4.17

## 0.1.2

### Patch Changes

- f34e0ff: feat: upgrade dependencies
- Updated dependencies [f34e0ff]
  - @universal-middleware/core@0.4.15

## 0.1.1

### Patch Changes

- 1a3a123: fix: srvx peerDependencies
- Updated dependencies [1a3a123]
  - @universal-middleware/core@0.4.12

## 0.1.0

### Minor Changes

- 540b8d8: feat: add srvx support

### Patch Changes

- Updated dependencies [540b8d8]
  - @universal-middleware/core@0.4.10
