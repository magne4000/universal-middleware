---
"@universal-middleware/node": patch
---

An HTTP/2 request takes its host from the `:authority` pseudo-header, which HTTP/2 clients send instead of `Host`, and which wins over a `Host` header when both are present (RFC 9113 §8.3.1). A request without a `Host` header got `localhost` and a warning before.
