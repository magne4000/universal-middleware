---
"@universal-middleware/core": patch
---

With `apply()` or `pipe()`, a middleware that reads the request body no longer leaves none for the middlewares and the handler after it.
`keepBody()` and `keptBody()` are exported.
