---
"@universal-middleware/core": patch
"@universal-middleware/cloudflare": patch
"@universal-middleware/elysia": patch
"@universal-middleware/express": patch
"@universal-middleware/fastify": patch
"@universal-middleware/h3": patch
"@universal-middleware/hattip": patch
"@universal-middleware/hono": patch
"@universal-middleware/srvx": patch
---

A response function can change the headers of a Response that has immutable headers. A route that returned `Response.redirect()` or a `fetch()` response answered 500 `TypeError: immutable` as soon as a response function set or deleted a header, and so did a response function that changed the headers after an earlier one returned such a Response. A response function now gets a copy with the same status, headers and body, with `apply()`, with `pipe()` and with middlewares registered one by one. Express and Fastify already copied a route's Response: there, only the second case failed.

`withMutableHeaders(response)` is exported for adapters: it returns that copy when the headers are immutable, else the Response itself.
