---
"@universal-middleware/compress": minor
---

`compress()` has `order: MiddlewareOrder.RESPONSE_COMPRESSION` (300), so `apply()` runs it after the middlewares with a lower `order`, the default 0 included, whatever their place in the list: a middleware whose response function rewrites the body gets the body uncompressed, and `compress()` compresses what it returns. It applied first when listed first, and the rewrite read compressed bytes.

A middleware that answers with a Response, such as `sirv()`, then runs before `compress()`. Its answer is still compressed with `@universal-middleware/core` 0.7.0 or later, whose `apply()` still runs the middlewares with a positive `order` after one answers. With an older core, it is sent uncompressed on every adapter except srvx and Cloudflare.
