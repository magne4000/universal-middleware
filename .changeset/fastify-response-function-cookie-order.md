---
"@universal-middleware/fastify": patch
---

Under a response function, a cookie it sets on the reply (`reply.header()`, or `@fastify/cookie`'s `setCookie()` and `clearCookie()`) is sent after the cookies of the route's Response. A refreshed or cleared cookie was sent first, so the client kept the old one.
