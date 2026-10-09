---
"@universal-middleware/vercel": patch
---

The optional `express` peer accepts Express 4 again (`^4 || ^5`, like the Express adapter). It required `^5.2.1`, so an Express 4 app got an unmet peer warning, although the Vercel adapter only uses Express's types and works with both.
