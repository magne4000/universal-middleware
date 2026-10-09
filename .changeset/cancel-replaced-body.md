---
"@universal-middleware/core": patch
"@universal-middleware/express": patch
"@universal-middleware/fastify": patch
"@universal-middleware/h3": patch
"@universal-middleware/hattip": patch
"@universal-middleware/hono": patch
"@universal-middleware/srvx": patch
"@universal-middleware/elysia": patch
"@universal-middleware/cloudflare": patch
---

When a response function replaces the Response, the body of the replaced one is cancelled, so an endless body (Server-Sent Events, a proxied stream) no longer keeps running. It is left alone when the replacement still reads it (the same stream, `pipeThrough`, `clone()`, `text()`, a wrapper that pulls from it). With Express, a response function no longer makes the adapter keep a second copy of the app's output in memory.
