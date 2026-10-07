# @universal-middleware/srvx

## 0.2.0

### Minor Changes

- 627168a: feat!: routes registered with `apply()` follow rou3 v0.12 through `@universal-middleware/core` 0.5, which aligns them with URLPattern: `*` matches the rest of the path, a bare `**` sets `runtime.params["0"]`, a `-` ends a param name, only one trailing slash is ignored, and a route holds at most one catch-all. See the core 0.5.0 changelog.

## 0.1.4

### Patch Changes

- Updated dependencies [10e6e5f]
- Updated dependencies [6bb65ff]
  - @universal-middleware/core@0.5.0

## 0.1.3

### Patch Changes

- 636b4bc: fix: apply typings to allow more lenient middleware types
- Updated dependencies [636b4bc]
  - @universal-middleware/core@0.4.17

## 0.1.2

### Patch Changes

- f34e0ff: feat: upgrade dependencies
- Updated dependencies [f34e0ff]
  - @universal-middleware/core@0.4.15

## 0.1.1

### Patch Changes

- 1a3a123: fix: srvx peerDependencies
- Updated dependencies [1a3a123]
  - @universal-middleware/core@0.4.12

## 0.1.0

### Minor Changes

- 540b8d8: feat: add srvx support

### Patch Changes

- Updated dependencies [540b8d8]
  - @universal-middleware/core@0.4.10
