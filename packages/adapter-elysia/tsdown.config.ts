import { defineTsdown } from "@universal-middleware/tsdown-config";

// `elysia` is a runtime import; `neverBundle: true` keeps it external (as tsup did).
export default defineTsdown({
  entry: ["./src/index.ts"],
  runtime: "neutral",
});
