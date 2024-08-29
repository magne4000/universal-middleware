import { createPagesFunction } from "../src/index.js";
import { handler } from "@universal-middleware/tests/utils";

export const onRequest = createPagesFunction(handler)();
