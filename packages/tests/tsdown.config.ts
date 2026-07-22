import { defineTsdown, externalFrameworks } from "@universal-middleware/tsdown-config";

export default defineTsdown({
  entry: ["./src/index.ts", "./src/utils.ts", "./src/utils-node.ts"],
  runtime: "node",
  // Bundles `@universal-middleware/core` (a devDependency) and its transitive
  // deps, so it cannot use `neverBundle: true`; externalize only the frameworks
  // the oxc dts resolver cannot follow.
  deps: { neverBundle: externalFrameworks },
});
