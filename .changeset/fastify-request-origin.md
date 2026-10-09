---
"@universal-middleware/fastify": patch
---

The request URL has the protocol and host of Fastify's `request.protocol` and `request.host`, which follow its `trustProxy` option: the host was the `Host` header. `createHandler`, `createMiddleware` and `apply` take an `origin` option (`FastifyAdapterOptions`), which sets the origin of the URL, as `process.env.ORIGIN` does.
