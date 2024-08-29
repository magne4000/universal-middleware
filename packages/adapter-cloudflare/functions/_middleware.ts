import { middlewares } from "@universal-middleware/tests/utils";
import { createPagesFunction } from "../src/index.js";

export const onRequest = [
  createPagesFunction(middlewares[0])(),
  createPagesFunction(middlewares[1])(),
  createPagesFunction(middlewares[2])(),
];
