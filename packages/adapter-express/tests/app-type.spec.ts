import type { Express as Express5 } from "express";
import type { Express as Express4 } from "express4";
import { expectTypeOf, test } from "vitest";
import type { App } from "../src/index.js";

// checked by `pnpm run test:typecheck`
test("App accepts Express 4 and Express 5 applications", () => {
  expectTypeOf<Express4>().toExtend<App>();
  expectTypeOf<Express5>().toExtend<App>();
  expectTypeOf<object>().not.toExtend<App>();
});
