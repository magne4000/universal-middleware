import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Request as ExpressRequest } from "express";
import { vikeHandler } from "./universal-entry.js";
import { expressWrapper, fromExpress, toExpress } from "./utils/express";
import helmet from "helmet";
import { expressPatcher } from "./utils/express-patcher";
import { rateLimit } from "express-rate-limit";
import session from "express-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isProduction = process.env.NODE_ENV === "production";
const root = __dirname;
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const hmrPort = process.env.HMR_PORT
  ? parseInt(process.env.HMR_PORT, 10)
  : 24678;

startServer();

// TODO take inspiration from https://github.com/hattipjs/hattip/blob/main/packages/adapter/adapter-node/src/request.ts
async function startServer() {
  const app = express();

  if (isProduction) {
    app.use(express.static(`${root}/dist/client`));
  } else {
    // Instantiate Vite's development server and integrate its middleware to our server.
    // ⚠️ We should instantiate it *only* in development. (It isn't needed in production
    // and would unnecessarily bloat our server in production.)
    const vite = await import("vite");
    const viteDevMiddleware = (
      await vite.createServer({
        root,
        server: { middlewareMode: true, hmr: { port: hmrPort } },
      })
    ).middlewares;
    app.use(viteDevMiddleware);
  }

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    keyGenerator: () => "some Key",
  });

  app.use(expressPatcher(helmet()));
  app.use(expressPatcher(limiter));
  // app.use(
  //   expressPatcher(
  //     session({
  //       secret: "keyboard cat",
  //       resave: false,
  //       saveUninitialized: true,
  //     }),
  //   ),
  // );

  /**
   * Vike route
   *
   * @link {@see https://vike.dev}
   **/
  app.all("*", expressWrapper(vikeHandler));

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
