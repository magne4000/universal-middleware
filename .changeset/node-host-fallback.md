---
"@universal-middleware/node": patch
---

A request without a `Host` header gets `localhost` as its host every time, not only the first time: later ones got the URL `http://undefined/…`.
