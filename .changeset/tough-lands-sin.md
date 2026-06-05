---
"@universal-middleware/express": patch
"@universal-middleware/core": patch
"@universal-middleware/node": patch
---

Fix duplicated Set-Cookie headers when Express response transformers mirror cookies already set on the response.
