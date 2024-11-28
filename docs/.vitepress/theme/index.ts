import TwoslashFloatingVue from "@shikijs/vitepress-twoslash/client";
import DefaultTheme from "vitepress/theme";
import "@shikijs/vitepress-twoslash/style.css";
import type { EnhanceAppContext } from "vitepress";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: EnhanceAppContext) {
    app.use(TwoslashFloatingVue);
  },
};
