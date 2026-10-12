---
"@universal-middleware/core": minor
---

`pipe()` runs its middlewares as `apply()` runs a list: sorted by `order`, and following `runs`. Once a middleware or handler answers with a `Response`:

- A middleware with an `order` of 0 or less (or none) listed after it no longer runs: in `pipe(handler, logger)`, `logger` doesn't run. Give it a positive `order`, or `runs: "after-response"` or `"always"`.
- A middleware with a positive `order` that returns a `Response` fails the call with a `TypeError` naming it. It used to be ignored.
- An `always` middleware's later `Response` is ignored, and its body cancelled.
