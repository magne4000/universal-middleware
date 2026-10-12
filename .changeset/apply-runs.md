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

`enhance()` takes a `runs` option, and `apply()` follows it the same way on every adapter:

- `"until-response"`, the default for an `order` of 0 or less (or none): at its place in the list, and not once a middleware answered with a `Response`.
- `"after-response"`, the default for a positive `order`: once a `Response` exists, after the handler or right after an earlier middleware answered. It acts through a response function.
- `"always"`: at its place in the list, whether a `Response` exists or not. The first `Response` answers, a later one is ignored.

Every response function of the list applies to the answer, in order. Each middleware is still registered with the server as its own middleware.
