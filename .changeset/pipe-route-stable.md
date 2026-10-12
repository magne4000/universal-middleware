---
"@universal-middleware/core": patch
---

`pipeRoute()` is no longer beta. It composes a list as `apply()` does into one universal middleware: it routes the handlers by `path` and `method`, and runs a middleware that has a `path` only for the requests that path matches.
