---
"@universal-middleware/h3": patch
"@universal-middleware/hattip": patch
"@universal-middleware/hono": patch
"@universal-middleware/srvx": patch
"@universal-middleware/webroute": patch
---

A middleware registered on its own (`app.use()`, srvx's `middleware`, webroute's `use()`) that reads the request body no longer leaves none for the middlewares and the route after it.
Express, Fastify and Elysia already kept it.
