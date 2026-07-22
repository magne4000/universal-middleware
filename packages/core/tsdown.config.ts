import { defineTsdown } from "@universal-middleware/tsdown-config";

export default defineTsdown({
  entry: {
    index: "./src/index.ts",
    cookie: "./src/cookies/index.ts",
  },
  runtime: "node",
  // Inline `rou3` rather than leaving it an external runtime dependency.
  deps: { neverBundle: true, alwaysBundle: ["rou3"] },
});
