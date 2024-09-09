import { handler, middlewares } from "@universal-middleware/tests/utils";
import { createHandler } from "../src/index.js";
import { pipe } from "@universal-middleware/core";

const cloudflareHandler = pipe(middlewares[0](), middlewares[1](), middlewares[2](), handler());

export default createHandler(() => cloudflareHandler)();
