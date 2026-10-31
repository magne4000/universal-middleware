---
"@universal-middleware/express": patch
---

A universal middleware owns the request body chunks it reads: writing into them or transferring their buffer no longer changes or stalls the body the next Express handler gets.
