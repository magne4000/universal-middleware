---
"@universal-middleware/core": minor
"@universal-middleware/hono": minor
"@universal-middleware/express": minor
"@universal-middleware/fastify": minor
"@universal-middleware/h3": minor
"@universal-middleware/elysia": minor
"@universal-middleware/hattip": minor
---

With `apply()`, a middleware with a positive `order` runs once a `Response` exists:

- It also runs when an earlier middleware answered: a compression middleware at `MiddlewareOrder.RESPONSE_COMPRESSION` now compresses what `sirv()` serves.
- It runs after the handler, no longer before it: a context it returns no longer reaches the handler. Give a middleware that must run before the handler a negative `order`, or `runs: "until-response"`.
