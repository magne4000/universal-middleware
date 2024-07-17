import { Hono } from "hono";
import { serve } from "@hono/node-server";
import handler from "@universal-middleware-examples/tool/dummy-handler-hono";

const app = new Hono();

app.get("/", handler);

serve(app);
