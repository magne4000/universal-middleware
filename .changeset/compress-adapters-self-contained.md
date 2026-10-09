---
"@universal-middleware/compress": patch
---

Importing an adapter entry such as `@universal-middleware/compress/hono` works again: its JS and types no longer import `universal-middleware`, which was only a devDependency.
