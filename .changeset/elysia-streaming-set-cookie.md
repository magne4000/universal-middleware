---
"@universal-middleware/elysia": patch
---

A streaming route (a generator, an async generator, `sse()`, a `ReadableStream`, or a `Response` sent with `transfer-encoding: chunked`) now sends the cookies its response functions add. Off Bun, Elysia streamed that Response again with only the headers of `set`, so the cookies were dropped; on Bun, the cookies the route set with Elysia's `cookie` replaced them. The Response is now sent as is, which also stops the route's stream once the client disconnects on Bun: it kept running.
