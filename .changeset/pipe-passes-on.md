---
"@universal-middleware/core": minor
---

When none of its middlewares answers, the middleware `pipe()` returns passes the request on instead of throwing "No Response found": it returns their context, or a response function that applies all of theirs to the response that comes next. When they return both, the context goes into the context object it was given. `pipeRoute()` without `handle404` does the same for a request no route matches.
