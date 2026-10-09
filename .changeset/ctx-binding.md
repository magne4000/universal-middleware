---
"@universal-middleware/cloudflare": patch
"@universal-middleware/srvx": patch
---

Calling `runtime.ctx.waitUntil()` or `runtime.ctx.passThroughOnException()` on Cloudflare no longer throws `TypeError: Illegal invocation`.
