import { defineTsdown } from "@universal-middleware/tsdown-config";

export default defineTsdown({
  entry: {
    index: "./src/index.ts",
    cookie: "./src/cookies/index.ts",
  },
  runtime: "node",
  // `rou3` is the one dependency tsup bundled; keep bundling it.
  deps: { neverBundle: true, alwaysBundle: ["rou3"] },
});
