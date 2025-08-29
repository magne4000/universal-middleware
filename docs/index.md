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
    details: Bundle your middlewares for Express, Hono, Fastify, Cloudflare, Vercel, h3, Elysia, Hattip, Webroute and srvx
    link: /reference/supported-adapters
  - title: Web Standards Compliance
    details: Write middlewares following established web standards (WinterCG, WHATWG) to ensure consistency and future-proofing
---


::: tip Who is this for?
- **Library authors** looking to create cross-platform middleware that works seamlessly across multiple web servers and cloud platforms
- **Framework developers** who want to provide flexibility by allowing users to choose their preferred server runtime and deployment target
:::
