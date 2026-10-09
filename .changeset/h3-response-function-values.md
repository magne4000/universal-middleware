---
"@universal-middleware/h3": patch
---

A response function no longer turns a route that returns a value h3 itself converts into a 500 (`Payload is not a Response or BodyInit compatible`). Objects, arrays, numbers and booleans are sent as JSON, strings as HTML, `null` as 204, and Node streams and objects with `arrayBuffer()` as h3 sends them, with the status and headers set on the event.
