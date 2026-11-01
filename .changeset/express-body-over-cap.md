---
"@universal-middleware/express": patch
---

A warning is logged once per process when a universal middleware read more than 1 MiB of the request body, which the next Express handler then gets empty or cut short.
