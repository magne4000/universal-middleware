---
"@universal-middleware/express": patch
"@universal-middleware/fastify": patch
"@universal-middleware/h3": patch
---

`getRuntime` is exported, as the other adapters already did. The Express adapter also exports the `NodeAdapterHandlerOptions` and `NodeAdapterMiddlewareOptions` types of its `createHandler` and `createMiddleware` options.
