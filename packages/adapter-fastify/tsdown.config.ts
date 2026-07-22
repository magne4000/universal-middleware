import { defineTsdown } from "@universal-middleware/tsdown-config";

export default defineTsdown({
  entry: ["./src/index.ts"],
  runtime: "node",
  // `fastify-plugin` is a devDependency, so inline it into the bundle.
  deps: { neverBundle: true, alwaysBundle: ["fastify-plugin"] },
});
