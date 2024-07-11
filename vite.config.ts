import devServer from "@hono/vite-dev-server";
import { hattip } from "@hattip/vite";
import { defineConfig, type PluginOption } from "vite";

export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [];

  switch (mode) {
    case "hattip":
      plugins.push(hattip());
      break;
    case "hono":
      plugins.push(
        devServer({
          entry: "playground/hono-entry.ts",

          exclude: [
            /^\/@.+$/,
            /.*\.(ts|tsx|vue)($|\?)/,
            /.*\.(s?css|less)($|\?)/,
            /^\/favicon\.ico$/,
            /.*\.(svg|png)($|\?)/,
            /^\/(public|assets|static)\/.+/,
            /^\/node_modules\/.*/,
          ],

          injectClientScript: false,
        }),
      );
      break;
  }

  return {
    plugins,
  };
});
