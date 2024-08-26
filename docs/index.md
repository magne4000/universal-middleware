---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "universal-middleware"
  text: 
  tagline: "Write middleware once, target Hono, Express, Fastify, and more!"
  actions:
    - theme: brand
      text: Guide
      link: /guide/introduction
    - theme: alt
      text: Examples
      link: /examples/context-middleware

features:
  - title: One middleware, multiple adapters
    details: Automatically generate compatible middlewares for popular servers, from a single codebase
    link: /guide/introduction
  - title: Support for popular servers
    details: Bundle your middlewares for Hono, Express, Fastify, h3, Hattip and Webroute
    link: /reference/supported-adapters
  - title: Web Standards Compliance
    details: Write middlewares following established web standards (WinterCG, WHATWG) to ensure consistency and future-proofing
---

