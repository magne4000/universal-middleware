import { handler } from "@universal-middleware/tests/utils";
import { createPagesFunction } from "../../src/index.js";

export const onRequest = createPagesFunction(handler)();
