---
"@universal-middleware/express": patch
---

On Express, a request body of up to 1 MiB that a universal middleware read is no longer empty for the Express handlers that run after it, such as `express.json()`.
