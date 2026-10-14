---
"@universal-middleware/core": minor
---

Fix: with `apply()` or `pipe()`, a middleware that reads the request body no longer leaves none for the middlewares and the handler after it, which failed with `Body is unusable` or a read that never settled. The list keeps the body of its request: the first read through `text()`, `json()`, `formData()`, `arrayBuffer()`, `bytes()` or `blob()` keeps the bytes, and every read after it is served from them, `request.body`, `bodyUsed` and `clone()` included. A body nobody reads through one of these methods isn't buffered. Every middleware still gets the server's own request, with its fields (`request.cf`, srvx's `request.ip`) and the headers an earlier middleware set.

A middleware that streams `request.body` itself still leaves nothing for the ones after it: read the body with one of these methods, or stream a `request.clone()`. After a body method read it, `new Request(request)` and `fetch(request)` still fail on Node, Deno and workerd (Cloudflare Workers), while `new Request(url, request)` works. A middleware registered on its own with an adapter's `createMiddleware()` isn't part of a list, so its request isn't kept, except on Elysia, whose adapter keeps every request's body.

`keepBody(request)`, which does this for any request, and `keptBody(request)`, the bytes it kept once something read them, are exported.
