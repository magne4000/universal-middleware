import { createPagesFunction } from "../../src/index.js";
import { throwEarlyAndLateHandler } from "@universal-middleware/tests/utils";

export const onRequest = createPagesFunction(throwEarlyAndLateHandler)();
