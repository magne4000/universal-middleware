---
"@universal-middleware/express": patch
"@universal-middleware/node": patch
---

fix(express): use the body already parsed by `express.json()` and the like instead of failing on the consumed stream
