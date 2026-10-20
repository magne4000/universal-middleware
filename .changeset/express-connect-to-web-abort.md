---
"@universal-middleware/express": patch
---

`connectToWeb()` aborts the handler's `request.signal` when the client disconnects, also when the server passes Node's request along (srvx on Node), and no longer aborts it once the response completed.
