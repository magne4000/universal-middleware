---
outline: deep
---

# What is `universal-middleware`?

`universal-middleware` is designed to help library authors write server logic once
and deploy it across multiple server frameworks seamlessly.
This suite allows you to create and bundle server-related code that works with all [supported adapters](/reference/supported-adapters),
ensuring consistency and reducing duplication.

Efficiently develop a wide range of middleware and handlers, including but not limited to:
- [HTTP Header Middleware](/recipes/headers-middleware): Easily modify or add headers to outgoing responses.
- [Context-Altering Middleware](/recipes/context-middleware): Enhance request [context](/definitions#context), such as adding user authentication properties for logged-in users.
- [Guard Middleware](/recipes/guard-middleware): Enforce request validation, like checking for an Authentication header before allowing further processing.
- Web Standard Handlers: Implement handlers that adhere to the Request/Response model defined by web standards.
