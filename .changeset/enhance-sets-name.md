---
"@universal-middleware/core": patch
---

`enhance(fn, { name })` also sets the `name` property of the returned function, so `enhance(fn, { name: 'logger' }).name` is `'logger'`. A clone made without a `name` option keeps the original function's name instead of `extendedFunction`. With `immutable: false`, a function whose `name` is non-configurable keeps it; `nameSymbol` still holds the given name.
