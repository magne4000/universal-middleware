---
"@universal-middleware/core": minor
---

A middleware with a `path` and a non-zero `order` now runs only for the requests that path (and its `method`, if set) matches, instead of being run everywhere with a warning.
