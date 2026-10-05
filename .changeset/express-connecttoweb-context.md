---
"@universal-middleware/express": patch
---

fix(express): `connectToWeb()` gives the app's routes the caller's context through `getContext(req)`, including the context srvx keeps on the request
