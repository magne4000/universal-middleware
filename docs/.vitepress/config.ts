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
    "Write standard-based middlewares and handlers once, target all supported servers",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Guide", link: "/guide/what-is-universal-middleware" },
      { text: "Examples", link: "/markdown-examples" },
    ],

    sidebar: [
      {
        text: "Examples",
        items: [
          { text: "Markdown Examples", link: "/markdown-examples" },
          { text: "Runtime API Examples", link: "/api-examples" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
});
