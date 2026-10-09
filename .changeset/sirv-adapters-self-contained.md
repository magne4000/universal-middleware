---
"@universal-middleware/sirv": patch
---

Importing an adapter entry such as `@universal-middleware/sirv/hono` works again: its JS and types no longer import `universal-middleware`, which was only a devDependency.
