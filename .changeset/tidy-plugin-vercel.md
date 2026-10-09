---
"universal-middleware": patch
"@universal-middleware/vercel": patch
---

The bundler plugin recognizes `handler` and `middleware` files and strips `outbase` with Windows path separators, where its patterns expected two backslashes instead of one. The Vercel adapter's srvx Node handler creates its request adapter once instead of on every request.
