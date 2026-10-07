---
"@universal-middleware/core": minor
---

feat(core)!: route patterns given to `apply()` and `pipeRoute()` follow rou3 v0.12, which aligns them with URLPattern ([migration guide](https://github.com/h3js/rou3/releases/tag/v0.12.0)):

- `*` matches the rest of the path, `/` included: `/files/*` now matches `/files/a/b`. Use `:name` to match one segment
- a bare `**` sets `runtime.params["0"]`; `runtime.params._` still works but is deprecated, and a `**` that matches no segment sets no key
- segments after `**` are matched: `/a/**/b` used to behave like `/a/**`
- a `-` ends a param name (`/:year-:month` gives `year` and `month`), and the first of several params in one segment takes as little as possible (`/:name.:ext` on `/a.tar.gz` gives `a` and `tar.gz`)
- `:name+`, `:name*` and `**:name` no longer take empty segments: `/foo/:bar+` does not match `/foo/a//b`
- a route holds at most one of `*`, `**`, `:x+`, `:x*`; registering a second one throws
- only one trailing slash is ignored: `/users/42//` no longer matches `/users/:id`
