import { createPagesFunction } from "../../src/index.js";
import { throwEarlyHandler } from "@universal-middleware/tests/utils";

export const onRequest = createPagesFunction(throwEarlyHandler)();
