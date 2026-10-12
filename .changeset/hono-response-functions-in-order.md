---
"@universal-middleware/hono": minor
---

Fix: on Hono, response functions apply in the order their middlewares are registered, as on every other adapter. They applied in reverse order, so the same list behaved differently per server. Registered one by one with `app.use()`, `compress()` then `rewrite`, where `rewrite` is a middleware whose response function edits the body, now hands gzip bytes to `rewrite`, as on every other adapter: register a body rewrite before `compress()`. `apply()` and `pipe()` sort them by `order` instead, and `compress()` declares `MiddlewareOrder.RESPONSE_COMPRESSION`.

An app that relied on the reverse order sees two or more response functions swap. A Hono middleware registered between them now sees the response before they apply, because they all apply after the rest of the chain.
