---
"@universal-middleware/compress": minor
---

`compress()` declares `order: MiddlewareOrder.RESPONSE_COMPRESSION`. With `apply()` or `pipe()`, it runs once a `Response` exists, wherever it is listed: `apply(app, [sirv("public"), compress()])` now compresses the files `sirv()` serves, and a middleware with a lower `order` that rewrites the body gets it uncompressed, even when listed after `compress()`. Registered one by one with the server, it still runs where it is registered.
