import { middlewares } from "@universal-middleware/tests/utils";
import { createPageFunction } from "../src/index.js";

export const onRequest = [
  createPageFunction(middlewares[0])(),
  createPageFunction(middlewares[1])(),
  createPageFunction(middlewares[2])(),
];
