import { handler } from "@universal-middleware/tests/utils";
import { handleMiddleware } from "elysia/cloudflare-pages";
import { createMiddleware } from "../src/index.js";

export const onRequest = handleMiddleware(createMiddleware(handler)());
