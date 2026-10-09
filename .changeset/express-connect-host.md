---
"@universal-middleware/express": patch
---

`connectToWeb` gives the app a `Host` header from the request URL when it creates the Node request itself. Without one, `req.headers.host` was undefined and universal handlers saw `http://localhost/…` with a warning, whatever host the request was for.
