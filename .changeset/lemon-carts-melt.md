---
"@universal-middleware/sirv": patch
---

fix(sirv): correct range, encoding, and dev-mode edge cases

A backwards range (`bytes=5-2`) is ignored and the full file served (RFC 9110
§14.2) instead of answering 416, which is now reserved for ranges past EOF.
`Accept-Encoding` negotiation honors the `*` wildcard (an explicit coding still
overrides it) and treats a valueless `q` as acceptable. And a missing directory
in `dev` mode no longer throws at construction, so a watch/lazy build that
produces the directory later can start.
