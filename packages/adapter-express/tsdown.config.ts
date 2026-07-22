import { defineTsdown } from "@universal-middleware/tsdown-config";

export default defineTsdown({
  entry: {
    index: "./src/index.ts",
    request: "./src/request.ts",
  },
  runtime: "node",
});
