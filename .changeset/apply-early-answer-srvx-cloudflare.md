---
"@universal-middleware/core": minor
"@universal-middleware/srvx": minor
"@universal-middleware/cloudflare": minor
---

With `apply()`, a middleware with an `order` of 0 or less (or none) no longer runs once an earlier middleware answered, as on the other adapters: a middleware listed after an authentication middleware that answers 401 doesn't run for that request.
