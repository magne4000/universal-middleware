---
"@universal-middleware/compress": minor
"@universal-middleware/sirv": minor
"@universal-middleware/vercel": minor
---

**BREAKING CHANGE:** the `h3` exports target h3 v2 (`h3@^2`), as `@universal-middleware/h3` now does. `createNodeHandler` and `createEdgeHandler` from `@universal-middleware/vercel/h3` take an h3 v2 app.
