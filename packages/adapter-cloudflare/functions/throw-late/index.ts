import { createPagesFunction } from "../../src/index.js";
import { throwLateHandler } from "@universal-middleware/tests/utils";

export const onRequest = createPagesFunction(throwLateHandler)();
