---
"@universal-middleware/node": patch
"@universal-middleware/express": patch
---

The `Request` the Express adapter makes again once a universal middleware has read the body reuses the abort signal of the first one, instead of adding a `close` listener to the response each time: 11 middlewares that read the body raised a `MaxListenersExceededWarning`.
