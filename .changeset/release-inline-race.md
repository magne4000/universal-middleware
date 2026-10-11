---
"@universal-middleware/compress": patch
"@universal-middleware/sirv": patch
---

Bundle the Universal Middleware packages they build on, as intended. The published compress 0.2.38 imported `@universal-middleware/core` and `@universal-middleware/elysia`, and sirv 0.1.30 imported `@universal-middleware/express`, without declaring them, because the release packed them while those packages were being rebuilt. A strict resolver such as Yarn PnP refused the imports.
