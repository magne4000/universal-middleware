---
"@universal-middleware/fastify": patch
---

The request URL has the protocol of Fastify's `request.protocol`, which follows Fastify's `trustProxy` option, as the Express adapter follows Express's `trust proxy`. Behind a proxy that terminates TLS, with `trustProxy` enabled, the URL was `http://…`.
