---
"universal-middleware": patch
---

The bundler plugin writes `package.json` with a trailing newline, and leaves it untouched when its `exports` did not change.
