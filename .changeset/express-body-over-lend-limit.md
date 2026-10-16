---
"@universal-middleware/express": patch
---

When a universal middleware reads over 1 MiB of a request body and passes the request on, the next Express handler now gets an error with status 413. It used to get an empty body, or only the bytes the middleware hadn't read.
