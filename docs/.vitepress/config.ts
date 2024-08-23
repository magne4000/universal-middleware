import { defineConfig } from "vitepress";
import { transformerTwoslash } from "@shikijs/vitepress-twoslash";
import type { ModuleResolutionKind } from "typescript";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  markdown: {
    codeTransformers: [
      transformerTwoslash({
        twoslashOptions: {
          compilerOptions: {
            verbatimModuleSyntax: true,
            moduleResolution: 100 satisfies ModuleResolutionKind.Bundler,
          },
        },
      }),
    ],
  },
  title: "universal-middleware",
  description:
    "Write universal middlewares and handlers once, target all supported servers",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Guide", link: "/guide/what-is-universal-middleware" },
      { text: "Examples", link: "/examples/context-middleware" },
    ],

    sidebar: [
      {
        text: "Middlewares",
        items: [
          {
            text: "Updating the context",
            link: "/examples/context-middleware",
          },
          {
            text: "Updating the headers",
            link: "/examples/headers-middleware",
          },
          {
            text: "Return an early response",
            link: "/examples/guard-middleware",
          },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
});
