---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "universal-middleware"
  text: 
  tagline: "Write middleware once, target Hono, Express, Cloudflare, and more!"
  actions:
    - theme: brand
      text: Guide
      link: /guide/introduction
    - theme: alt
      text: Recipes
      link: /recipes/context-middleware

features:
  - title: One middleware, multiple adapters
    details: Automatically generate compatible middlewares for popular servers, from a single codebase
    link: /guide/introduction
  - title: Support for popular servers
    details: Bundle your middlewares for Express, Hono, Fastify, Cloudflare, Vercel, h3, Elysia, Hattip and Webroute
    link: /reference/supported-adapters
  - title: Web Standards Compliance
    details: Write middlewares following established web standards (WinterCG, WHATWG) to ensure consistency and future-proofing
---

