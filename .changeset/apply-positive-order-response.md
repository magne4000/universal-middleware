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

With `apply()`, a middleware with a positive `order` (or `runs: "after-response"`) that returns a `Response` fails the request with a `TypeError` naming it. It used to answer on Hono, Express, Fastify, h3, Elysia and HatTip, and was ignored on srvx and Cloudflare. A cache that answers hits needs a negative `order`, such as `MiddlewareOrder.CACHING`.
