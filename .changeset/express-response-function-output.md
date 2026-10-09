---
"@universal-middleware/express": patch
---

Under a response function, the Express app's response keeps what Node would have sent:

- the status, status message and headers passed to `res.writeHead()`, which were dropped;
- a string written with an encoding (`res.write(data, "hex")`), which was encoded as UTF-8;
- the callbacks of `res.write()` and `res.end()`, which were never called, and `res.end()` returns the response;
- backpressure: `res.write()` returns false, and `drain` follows, when the app writes faster than the response is sent. The app's whole output was held in memory.

A Response without a body, returned by the response function, is sent without a body: the app's body was sent with it.
