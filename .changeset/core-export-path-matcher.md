---
"@universal-middleware/core": patch
---

`createMatcher(path, method)` and `scopeToPath(middleware)` are exported: the path check `apply()` puts in front of a middleware that has a `path`, for code that runs middlewares itself. `createMatcher` returns `(request: Request) => boolean`, matching like a route with that `path` and `method` (the decoded pathname, `HEAD` for a `GET` route); `scopeToPath` returns the middleware wrapped with that check.
