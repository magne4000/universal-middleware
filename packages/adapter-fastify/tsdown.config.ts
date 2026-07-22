import { defineTsdown } from "@universal-middleware/tsdown-config";

export default defineTsdown({
  entry: ["./src/index.ts"],
  runtime: "node",
  // `fastify-plugin` is a devDependency tsup bundled; keep bundling it.
  deps: { neverBundle: true, alwaysBundle: ["fastify-plugin"] },
});
