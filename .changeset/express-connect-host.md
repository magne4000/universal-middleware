---
"@universal-middleware/express": patch
---

`createIncomingMessage`, which `connectToWeb` uses when it creates the Node request itself, gives the request a `Host` header from the request URL unless the `Request` has one. Without it, `req.headers.host` was undefined, and universal handlers saw `http://localhost/…` with a warning, whatever host the request was for.
