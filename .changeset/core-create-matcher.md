---
"@universal-middleware/core": patch
---

`createMatcher(path, method)` is exported: it returns `(request: Request) => boolean`, the check `apply()` uses to run a middleware that has a `path` only for the requests a route with that `path` and `method` would match (the decoded pathname, `HEAD` for a `GET` route, any method without `method`).
