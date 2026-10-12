---
"@universal-middleware/core": minor
"@universal-middleware/hono": minor
"@universal-middleware/express": minor
"@universal-middleware/fastify": minor
"@universal-middleware/h3": minor
"@universal-middleware/elysia": minor
"@universal-middleware/hattip": minor
"@universal-middleware/srvx": minor
"@universal-middleware/cloudflare": minor
---

`apply()` runs a list the same way on every adapter, and `enhance()` takes a `runs` option that says when a middleware runs:

- `"until-response"`, the default for an `order` of 0 or less (or none): at its place in the list, and not once a middleware answered with a `Response`.
- `"after-response"`, the default for a positive `order`: once a `Response` exists, after the handler or right after an earlier middleware answered. It acts through a response function: returning a `Response` from it fails the request with a `TypeError`.
- `"always"`: at its place in the list, whether a `Response` exists or not. The first `Response` answers, a later one is ignored.

Every response function of the list applies to the answer, in order. Each middleware is still registered with the server as its own middleware.

What changes for an existing list:

- On Hono, Express, Fastify, h3, Elysia and HatTip, a middleware with a positive `order` now also runs when an earlier middleware answered: a compression middleware at `MiddlewareOrder.RESPONSE_COMPRESSION` now compresses what `sirv()` serves.
- On the same adapters, a middleware with a positive `order` now runs after the handler: a context it returns no longer reaches the handler, and a `Response` it returns fails the request instead of answering. Give a middleware that must run before the handler (a cache that answers hits, a logger that times the handler) a negative `order`, or `runs: "until-response"`.
- On srvx and Cloudflare, a middleware with an `order` of 0 or less (or none) no longer runs once an earlier middleware answered.
