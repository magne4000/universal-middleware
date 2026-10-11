---
"@universal-middleware/core": minor
"@universal-middleware/hono": minor
"@universal-middleware/express": minor
"@universal-middleware/fastify": minor
"@universal-middleware/h3": minor
"@universal-middleware/elysia": minor
"@universal-middleware/hattip": minor
"@universal-middleware/srvx": patch
"@universal-middleware/cloudflare": patch
---

Fix: when a middleware in an `apply()` list returns a Response, the middlewares with a positive `order` still run, and every response function applies to that Response in list order, so one list means the same on every adapter. On Hono, Express, Fastify, h3, Elysia and HatTip none of the middlewares after it ran: a compression middleware at `MiddlewareOrder.RESPONSE_COMPRESSION` never compressed what `sirv()` served. The middlewares after it with an `order` of 0 or less (the default) and the handlers don't run, so a middleware listed after an authentication middleware that answers 401 doesn't run for that request. On srvx and Cloudflare they used to run.

On Hono, Express, Fastify, h3, Elysia and HatTip, a middleware with a positive `order` now runs after the handler, as `pipe()` runs it: a context it returns no longer reaches the handler, and a Response it returns is ignored. A Response returned after the first one is ignored, and its body cancelled, on every adapter and in `pipe()`. When one list has a middleware that returns a context and another that returns a response function, the context is merged into the request's context rather than replacing it.
