---
"@universal-middleware/express": patch
"@universal-middleware/elysia": patch
---

A universal middleware owns the request body chunks it reads: writing into them or transferring their buffer no longer changes or stalls the body the route gets.
