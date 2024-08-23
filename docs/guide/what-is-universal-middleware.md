---
outline: deep
---

# What is `universal-middleware`?

The primary objective of this package suite is to enable library authors to write server-related logic once
and bundle it across all [supported servers](/reference/supported-servers).

Examples of [middleware](/definitions#middleware) or [handlers](/definitions#handler) that can benefit from this suite include:
- [Middleware that modifies HTTP headers](/examples/headers-middleware)
- [Middleware that alters request-related context](/examples/context-middleware), such as authentication middleware that adds a user property for logged-in users
- Middleware that enforces guard logic on requests, like checking for an Authentication header before proceeding
- Handlers implemented according to the web standard Request/Response model
