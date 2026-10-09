---
"@universal-middleware/h3": patch
"@universal-middleware/elysia": patch
---

`@universal-middleware/h3` and `@universal-middleware/elysia` now declare `h3` and `elysia` as peer dependencies, so they resolve the framework they import under strict package managers (pnpm without hoisting, Yarn PnP).
