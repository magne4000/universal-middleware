---
"@universal-middleware/node": patch
---

`responseAdapter` makes a relative redirect `Location` absolute with an HTTP/2 request's `:authority`, as `createRequestAdapter` does for the request URL. It used `localhost`, as an HTTP/2 request may have no `Host` header.
