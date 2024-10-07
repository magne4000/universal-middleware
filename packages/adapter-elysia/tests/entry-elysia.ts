import { args } from "@universal-middleware/tests";
import { handler, middlewares, routeParamHandler } from "@universal-middleware/tests/utils";
import { Elysia } from "elysia";
import { createHandler, createMiddleware } from "../src/index.js";

const app = new Elysia()
  .use(createMiddleware(middlewares[0])())
  .use(createMiddleware(middlewares[1])())
  .use(createMiddleware(middlewares[2])())
  .get("/user/:name", createHandler(routeParamHandler)())
  .get("/", createHandler(handler)());

const port = args.port ? Number.parseInt(args.port) : 3000;

app.listen(port);

// if (deno) {
//   // @ts-ignore
//   Deno.serve(
//     {
//       port,
//       onListen() {
//         console.log(`Server listening on http://localhost:${port}`);
//       },
//     },
//     app.fetch,
//   );
// } else if (!bun) {
//   const { serve } = await import("@elysia/node-server");
//   serve(
//     {
//       fetch: app.fetch,
//       port,
//     },
//     () => {
//       console.log(`Server listening on http://localhost:${port}`);
//     },
//   );
// }
//
// // Bun
// export default {
//   port,
//   fetch: app.fetch,
// };
