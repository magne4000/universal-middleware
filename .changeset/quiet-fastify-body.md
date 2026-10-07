---
"@universal-middleware/fastify": patch
"@universal-middleware/node": patch
---

fix(fastify): a universal middleware no longer breaks the body of the routes after it, and `fastify-raw-body` is not required to read it
