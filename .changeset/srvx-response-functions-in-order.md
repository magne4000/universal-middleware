---
"@universal-middleware/srvx": minor
---

Fix: with srvx's `createMiddleware` used without `apply()`, response functions apply in the order their middlewares are registered, as everywhere else. They applied in reverse order, so the same list behaved differently than with `apply()`. Now `[compress(), rewrite]`, where `rewrite` is a middleware whose response function edits the body, hands gzip bytes to `rewrite` on every adapter, so list a body rewrite before `compress()`.

An app that relied on the reverse order sees two or more response functions swap. An srvx middleware registered between them now sees the response before they apply, because they all apply after the rest of the chain.
