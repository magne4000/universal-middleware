---
"@universal-middleware/node": patch
---

`sendResponse` sends a body already in memory (a string, a buffer, JSON, a stream that is already complete) in one write, with its `Content-Length`, instead of chunked. It streams any other Web stream body itself, as fast as the client takes it, rather than through `Readable.fromWeb` and `pipeline`, and no longer imports `node:stream` for every response. `setResponseHeaders` no longer copies the Node response's headers outside of mirror mode.
