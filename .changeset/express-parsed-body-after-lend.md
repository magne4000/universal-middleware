---
"@universal-middleware/express": patch
---

A universal handler placed after a body parser such as `express.json()` reads the parsed body when a universal middleware before the parser left the body unread. It read an empty body.
