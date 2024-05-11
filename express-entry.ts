import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Request as ExpressRequest } from "express";
import { vikeHandler } from "./universal-entry.js";
import { Stream } from "node:stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isProduction = process.env.NODE_ENV === "production";
const root = __dirname;
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const hmrPort = process.env.HMR_PORT
  ? parseInt(process.env.HMR_PORT, 10)
  : 24678;

startServer();

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

  /**
   * Vike route
   *
   * @link {@see https://vike.dev}
   **/
  app.all("*", async (req: ExpressRequest, res, next) => {
    // const pageContextInit = { urlOriginal: req.originalUrl };
    //
    // const pageContext = await renderPage(pageContextInit);
    // const { httpResponse } = pageContext;
    //
    // if (!httpResponse) {
    //   return next();
    // } else {
    //   const { statusCode, headers } = httpResponse;
    //   headers.forEach(([name, value]) => res.setHeader(name, value));
    //   res.status(statusCode);
    //   httpResponse.pipe(res);
    // }
    const ctx = {};
    const webResponse = await vikeHandler(
      new Request(req.url, {
        // TODO set-cookies special case
        headers: req.headers as Record<string, string>,
        body: req.body,
        method: req.method,
      }),
      ctx,
    );

    if (webResponse.body) {
      Stream.Readable.fromWeb(webResponse.body as any).pipe(res);
    } else {
      next();
    }
  });

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
