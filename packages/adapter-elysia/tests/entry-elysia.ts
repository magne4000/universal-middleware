import { args } from "@universal-middleware/tests";
import { app } from "./elysia";
import { Elysia } from "elysia";

const port = args.port ? Number.parseInt(args.port) : 3000;

new Elysia({ aot: false }).use(app).listen(port);
