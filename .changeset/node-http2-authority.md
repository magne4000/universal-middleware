---
"@universal-middleware/node": patch
---

An HTTP/2 request without a `Host` header takes its host from the `:authority` pseudo-header. It got `localhost` and a warning before, since HTTP/2 clients send `:authority` instead of `Host`.
