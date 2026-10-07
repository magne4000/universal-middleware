---
"@universal-middleware/elysia": patch
---

fix(elysia): a universal middleware no longer replaces Elysia's body parsing for the routes after it; in an app with no universal middleware, a `createHandler` on a route with a body schema no longer gets the body (Node: 500 `unusable`; Bun: an empty body), and an app hook that reads `request.body` directly before the middleware makes a middleware that reads the body fail
