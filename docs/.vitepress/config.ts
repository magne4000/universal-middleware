import { transformerTwoslash } from "@shikijs/vitepress-twoslash";
import type { ModuleResolutionKind } from "typescript";
import { defineConfig } from "vitepress";

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
  description: "Write middleware once, target Hono, Express, Cloudflare, and more",
  themeConfig: {
    logo: {
      light: "/logo.png",
      dark: "/logo-dark.png",
    },

    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Guide", link: "/guide/introduction" },
      { text: "Recipes", link: "/recipes/context-middleware" },
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
        text: "Recipes",
        items: [
          {
            text: "Updating the context",
            link: "/recipes/context-middleware",
          },
          {
            text: "Updating the headers",
            link: "/recipes/headers-middleware",
          },
          {
            text: "Return an early response",
            link: "/recipes/guard-middleware",
          },
          {
            text: "Using route parameters",
            link: "/recipes/params-handler",
          },
          {
            text: "Using env variables",
            link: "/recipes/env-helper",
          },
        ],
      },
      {
        text: "Definitions",
        link: "/definitions",
      },
      { text: "Supported adapters", link: "/reference/supported-adapters" },
    ],

    search: {
      provider: "local",
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/magne4000/universal-middleware",
      },
    ],
  },
});
