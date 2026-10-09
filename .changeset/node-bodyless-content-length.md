---
"@universal-middleware/node": patch
---

`sendResponse` no longer sends `Content-Length: 0` with a 204 Response, which must not carry one, nor with a 304, whose `Content-Length` describes the 200 response (RFC 9110 §8.6). Other Responses without a body still get it.
