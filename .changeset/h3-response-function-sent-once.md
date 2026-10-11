---
"@universal-middleware/h3": patch
---

A response function that returns a new Response works behind `toWebHandler` (Bun, Deno, any `fetch` runtime): `compress()`, or any function that reads the body, no longer throws `Response body object should not be disturbed or locked`, and a Response that replaces the body without reading it is sent instead of the original. Behind `toNodeListener`, a request that any response function runs on no longer reaches `onError` with `ERR_HTTP_HEADERS_SENT`, and `onAfterResponse` runs for it.
