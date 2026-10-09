---
"@universal-middleware/core": patch
---

A `HEAD` request is answered by the `GET` route or middleware when it has no `HEAD` route. This also applies to a middleware or handler with a `path`, as it already did without one.
