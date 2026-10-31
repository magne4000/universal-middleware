---
"@universal-middleware/express": patch
---

After a universal middleware read more than 1 MiB of the request body, Express's body parsers answer with a 413 instead of a 400, and a route reading the request with `for await` or an `error` listener gets that error instead of an empty body.
