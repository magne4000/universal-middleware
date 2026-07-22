# @universal-middleware/node

## 0.2.2

### Patch Changes

- 5bf08ce: fix(node): report failures while sending the response instead of swallowing them
- b26ca94: fix(node): answer HEAD without draining the response body
- 3e5f59e: fix(node): resolve `X-Forwarded-*` from the trusted hop and gate it on `trustProxy`
- 20f6325: feat(node): resolve the origin from the `Forwarded` header (RFC 7239)
- 5421dcd: fix(node): resolve forwarded `proto`/`host` like Express `trust proxy`, and broaden client-abort detection

  `X-Forwarded-*` is now authoritative and read as its first (client-facing) value,
  matching Express; the RFC 7239 `Forwarded` header only fills a param the legacy
  header omits, so a passed-through client `Forwarded` can no longer override what
  the proxy set. Send-error logging also treats `ERR_STREAM_DESTROYED`/`ABORT_ERR`
  as routine client aborts, and the HEAD check guards a possibly-absent `req`.

## 0.2.1

### Patch Changes

- 060a74e: fix: duplicated Set-Cookie headers when Express response transformers mirror cookies already set on the response.
- Updated dependencies [060a74e]
  - @universal-middleware/core@0.4.18

## 0.2.0

### Minor Changes

- cd60e02: fix(node): wire request.signal to client disconnect, backpressure

## 0.1.0

### Minor Changes

- 2f31e30: feat: move node utilities in a dedicated package
