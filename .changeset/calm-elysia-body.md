---
"@universal-middleware/elysia": patch
---

fix(elysia): a universal middleware no longer replaces Elysia's body parsing for the routes after it; a `createHandler` passed straight to a route with a body schema still returns 500 (`unusable`) when it reads the body
