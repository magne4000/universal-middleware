---
"@universal-middleware/express": patch
---

`connectToWeb()`: when the client leaves mid-upload, the request body the app reads fails with `ECONNRESET`, as on Node's server, instead of ending as if it were complete. As on Node's server too, that error, like a failure of the request's body stream, is only emitted to `error` listeners.
