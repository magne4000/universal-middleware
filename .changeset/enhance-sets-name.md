---
"@universal-middleware/core": patch
---

`enhance(fn, { name })` also sets the `name` property of the returned function, so `fn.name` returns the given name. A clone made without a `name` option keeps the original function's name instead of `extendedFunction`.
