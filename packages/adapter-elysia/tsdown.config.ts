import { defineTsdown } from "@universal-middleware/tsdown-config";

// `elysia` is a runtime import; the default leaves it external.
export default defineTsdown({
  entry: ["./src/index.ts"],
  runtime: "neutral",
});
