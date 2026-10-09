---
"@universal-middleware/express": patch
---

`connectToWeb` keeps the status message of the app's response, and the repeated headers of a `res.writeHead()` flat `[name, value, …]` list: the status text was dropped, and the list gave headers named `0`, `1`, ….
