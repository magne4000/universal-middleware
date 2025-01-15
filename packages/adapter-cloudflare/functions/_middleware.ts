import { middlewares } from "@universal-middleware/tests/utils";
import { createPagesFunction } from "../src/index.js";

export const onRequest = [
  createPagesFunction(() => middlewares.guard)(),
  createPagesFunction(() => middlewares.contextSync)(),
  createPagesFunction(() => middlewares.updateHeaders)(),
  createPagesFunction(() => middlewares.contextAsync)(),
];
