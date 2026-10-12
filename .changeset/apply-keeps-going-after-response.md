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

Fix: when a middleware in an `apply()` list returns a Response, the middlewares with a positive `order` still run, and every response function applies to that Response in list order, so one list means the same on every adapter. On Hono, Express, Fastify, h3, Elysia and HatTip none of the middlewares after it ran: a compression middleware at `MiddlewareOrder.RESPONSE_COMPRESSION` never compressed what `sirv()` served. The middlewares after it with an `order` of 0 or less (the default) and the handlers don't run, so a middleware listed after an authentication middleware that answers 401 doesn't run for that request. On srvx and Cloudflare they used to run.

On Hono, Express, Fastify, h3, Elysia and HatTip, a middleware with a positive `order` now runs after the handler, as `pipe()` runs it: a context it returns no longer reaches the handler, and a Response it returns is ignored. A Response returned after the first one is ignored, and its body cancelled, on every adapter and in `pipe()`. On Express and Elysia, a header a middleware in the list sets on the Request now reaches the middlewares after it, as on the other adapters: on Elysia it never did, on Express not once a middleware had read the body.

On Hono, Express, Fastify and HatTip, when a middleware in the list throws, the response functions of the ones before it no longer apply to the error response.
