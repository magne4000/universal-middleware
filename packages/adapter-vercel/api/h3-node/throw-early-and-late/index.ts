import { middlewares, throwEarlyAndLateHandler } from "@universal-middleware/tests/utils";
import { createApp } from "h3";
import { createHandler, createMiddleware, universalOnBeforeResponse } from "@universal-middleware/h3";
import { createNodeHandler } from "../../../src/h3.js";

const app = createApp({ onBeforeResponse: universalOnBeforeResponse });

app.use(createMiddleware(() => middlewares.throwEarly)());
app.use(createMiddleware(() => middlewares.throwLate)());
app.use(createMiddleware(() => middlewares.contextSync)());
app.use(createMiddleware(() => middlewares.updateHeaders)());
app.use(createMiddleware(() => middlewares.contextAsync)());
app.use(createHandler(throwEarlyAndLateHandler)());

export default createNodeHandler(app);
