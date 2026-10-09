---
"@universal-middleware/h3": patch
---

A `HEAD` request answered with a streaming body that never ends (for example Server-Sent Events) no longer hangs: the response is sent with its status and headers and the body is cancelled.
