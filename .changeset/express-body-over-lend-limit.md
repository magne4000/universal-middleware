---
"@universal-middleware/express": patch
---

When a universal middleware reads over 1 MiB of a request body and passes the request on, Express's error handling now gets an error with status 413, and a server without `next` answers 413. The next handler used to get an empty body, or only the bytes the middleware hadn't read.
