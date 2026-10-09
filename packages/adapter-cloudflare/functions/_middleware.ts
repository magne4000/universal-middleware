import { middlewares } from "@universal-middleware/tests/utils";
import { createPagesFunction } from "../src/index.js";
import { waitUntilMiddleware } from "../tests/wait-until.js";

export const onRequest = [
  createPagesFunction(() => waitUntilMiddleware)(),
  createPagesFunction(() => middlewares.throwEarly)(),
  createPagesFunction(() => middlewares.throwLate)(),
  createPagesFunction(() => middlewares.guard)(),
  createPagesFunction(() => middlewares.contextSync)(),
  createPagesFunction(() => middlewares.updateHeaders)(),
  createPagesFunction(() => middlewares.contextAsync)(),
];
