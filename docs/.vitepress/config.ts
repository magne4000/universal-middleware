import { defineConfig } from "vitepress";
import { transformerTwoslash } from "@shikijs/vitepress-twoslash";
import type { ModuleResolutionKind } from "typescript";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  cleanUrls: true,
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
  description: "Write middleware once, target Hono, Express, Fastify, and more",
  themeConfig: {
    logo: {
      light: "/logo.png",
      dark: "/logo-dark.png",
    },

    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Guide", link: "/guide/introduction" },
      { text: "Examples", link: "/examples/context-middleware" },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          {
            text: "Introduction",
            link: "/guide/introduction",
          },
          {
            text: "Quick Start",
            link: "/guide/quick-start",
          },
          {
            text: "Packaging",
            link: "/guide/packaging",
          },
        ],
      },
      {
        text: "Examples",
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
      {
        text: "Definitions",
        link: "/definitions",
      },
      { text: "Supported adapters", link: "/reference/supported-adapters" },
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/magne4000/universal-middleware",
      },
    ],
  },
});
