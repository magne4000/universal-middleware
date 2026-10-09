---
"@universal-middleware/express": patch
---

The body of the Response a response function returns is read only as fast as the client takes it, and is cancelled when the client leaves or when the request is a `HEAD`. An endless body (Server-Sent Events, a proxied stream) was read on, and held in memory, after the client had left.
