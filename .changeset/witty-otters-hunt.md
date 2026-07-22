---
"@universal-middleware/node": patch
---

fix(node): resolve forwarded `proto`/`host` like Express `trust proxy`, and broaden client-abort detection

`X-Forwarded-*` is now authoritative and read as its first (client-facing) value,
matching Express; the RFC 7239 `Forwarded` header only fills a param the legacy
header omits, so a passed-through client `Forwarded` can no longer override what
the proxy set. Send-error logging also treats `ERR_STREAM_DESTROYED`/`ABORT_ERR`
as routine client aborts, and the HEAD check guards a possibly-absent `req`.
