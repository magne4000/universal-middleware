import type { Stats } from "node:fs";
import * as fs from "node:fs";
import { join, normalize, resolve } from "node:path";
import { totalist } from "totalist/sync";
import { lookup } from "mrmime";
import { Readable } from "node:stream";
import type { UniversalMiddleware } from "@universal-middleware/core";

type SetHeadersFunction = (res: Response, pathname: string, stats: fs.Stats) => void;

interface FileData {
  abs: string;
  stats: fs.Stats;
  headers: Record<string, string>;
}

type Arrayable<T> = T | T[];

export interface ServeOptions {
  dev?: boolean;
  etag?: boolean;
  maxAge?: number | null;
  immutable?: boolean;
  single?: string | boolean;
  ignores?: false | Arrayable<string | RegExp>;
  extensions?: string[];
  dotfiles?: boolean;
  brotli?: boolean;
  gzip?: boolean;
  onNoMatch?: (req: Request) => Response;
  setHeaders?: (res: Response, pathname: string, stats: Stats) => void;
}

const noop = () => {};

function isMatch(uri: string, arr: RegExp[]): boolean {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].test(uri)) return true;
  }
  return false;
}

function toAssume(uri: string, extns: string[]): string[] {
  let i = 0;
  let x: string;
  const len = uri.length - 1;
  if (uri.charCodeAt(len) === 47) {
    uri = uri.substring(0, len);
  }

  const arr: string[] = [];
  const tmp = `${uri}/index`;
  for (; i < extns.length; i++) {
    x = extns[i] ? `.${extns[i]}` : "";
    if (uri) arr.push(uri + x);
    arr.push(tmp + x);
  }

  return arr;
}

function viaCache(cache: Record<string, FileData>, uri: string, extns: string[]): FileData | undefined {
  let i = 0;
  let data: FileData | undefined;
  const arr = toAssume(uri, extns);
  for (; i < arr.length; i++) {
    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    if ((data = cache[arr[i]])) return data;
  }
  return undefined;
}

function viaLocal(dir: string, isEtag: boolean, uri: string, extns: string[]): FileData | undefined {
  let i = 0;
  const arr = toAssume(uri, extns);
  let abs: string;
  let stats: fs.Stats;
  let name: string;
  let headers: Record<string, string>;
  for (; i < arr.length; i++) {
    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    abs = normalize(join(dir, (name = arr[i])));
    if (abs.startsWith(dir) && fs.existsSync(abs)) {
      stats = fs.statSync(abs);
      if (stats.isDirectory()) continue;
      headers = toHeaders(name, stats, isEtag);
      headers["Cache-Control"] = isEtag ? "no-cache" : "no-store";
      return { abs, stats, headers };
    }
  }
  return undefined;
}

function is404() {
  return new Response("Not Found", { status: 404 });
}

function send(req: Request, file: string, stats: fs.Stats, headers: Record<string, string>): Response | undefined {
  let code = 200;
  const opts: { start?: number; end?: number } = {};
  headers = { ...headers };

  const rangeHeader = req.headers.get("range");

  if (rangeHeader) {
    code = 206;
    const [x, y] = rangeHeader.replace("bytes=", "").split("-");
    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    let end = (opts.end = Number.parseInt(y, 10) || stats.size - 1);
    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    const start = (opts.start = Number.parseInt(x, 10) || 0);

    if (end >= stats.size) {
      end = stats.size - 1;
    }

    if (start >= stats.size) {
      return new Response(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${stats.size}`,
        },
      });
    }

    headers["Content-Range"] = `bytes ${start}-${end}/${stats.size}`;
    headers["Content-Length"] = (end - start + 1).toString();
    headers["Accept-Ranges"] = "bytes";
  }

  const webStream = Readable.toWeb(fs.createReadStream(file)) as unknown as ReadableStream<Uint8Array>;

  return new Response(webStream, {
    status: code,
    headers,
  });
}

const ENCODING: Record<string, string> = {
  ".br": "br",
  ".gz": "gzip",
};

function toHeaders(name: string, stats: fs.Stats, isEtag: boolean): Record<string, string> {
  const enc = ENCODING[name.slice(-3)];

  let ctype = lookup(name.slice(0, enc ? -3 : undefined)) || "";
  if (ctype === "text/html") ctype += ";charset=utf-8";

  const headers: Record<string, string> = {
    "Content-Length": stats.size.toString(),
    "Content-Type": ctype,
    "Last-Modified": stats.mtime.toUTCString(),
  };

  if (enc) headers["Content-Encoding"] = enc;
  // biome-ignore lint/complexity/useLiteralKeys: <explanation>
  if (isEtag) headers["ETag"] = `W/"${stats.size}-${stats.mtime.getTime()}"`;

  return headers;
}

// Create a universal middleware that accepts standard Request
function createUniversalMiddleware(
  dir: string,
  isEtag: boolean,
  isSPA: boolean,
  ignores: RegExp[],
  lookup: (uri: string, extns: string[]) => FileData | undefined,
  extensions: string[],
  gzips: false | string[] | undefined,
  brots: false | string[] | undefined,
  setHeaders: SetHeadersFunction,
  isNotFound: (req: Request) => Response,
  fallback: string,
): UniversalMiddleware {
  return (request: Request): Response => {
    const extns = [""];
    const url = new URL(request.url);
    let pathname = url.pathname;
    const acceptEncoding = request.headers.get("accept-encoding") || "";

    if (gzips && acceptEncoding.includes("gzip")) extns.unshift(...gzips);
    if (brots && /(br|brotli)/i.test(acceptEncoding)) extns.unshift(...brots);
    extns.push(...extensions);

    if (pathname.indexOf("%") !== -1) {
      try {
        pathname = decodeURI(pathname);
      } catch (err) {
        /* malform uri */
      }
    }

    const data = lookup(pathname, extns) || (isSPA && !isMatch(pathname, ignores) && lookup(fallback, extns));
    if (!data) return isNotFound(request);

    // biome-ignore lint/complexity/useLiteralKeys: <explanation>
    if (isEtag && request.headers.get("if-none-match") === data.headers["ETag"]) {
      return new Response(null, { status: 304 });
    }

    if (gzips || brots) {
      // biome-ignore lint/complexity/useLiteralKeys: <explanation>
      data.headers["Vary"] = "Accept-Encoding";
    }

    const response = send(request, data.abs, data.stats, data.headers) as Response;
    setHeaders(response, pathname, data.stats);
    return response;
  };
}

export default function serveStatic(dir?: string, opts: ServeOptions = {}): UniversalMiddleware {
  dir = resolve(dir || ".");

  const isNotFound: (req: Request) => Response = opts.onNoMatch || is404;
  const setHeaders: SetHeadersFunction = opts.setHeaders || noop;

  const extensions: string[] = opts.extensions || ["html", "htm"];
  const gzips = opts.gzip && extensions.map((x) => `${x}.gz`).concat("gz");
  const brots = opts.brotli && extensions.map((x) => `${x}.br`).concat("br");

  const FILES: Record<string, FileData> = {};

  let fallback = "/";
  const isEtag = !!opts.etag;
  const isSPA = !!opts.single;
  if (typeof opts.single === "string") {
    const idx = opts.single.lastIndexOf(".");
    fallback += ~idx ? opts.single.substring(0, idx) : opts.single;
  }

  const ignores: RegExp[] = [];
  if (opts.ignores !== false) {
    ignores.push(/[/]([A-Za-z\s\d~$._-]+\.\w+){1,}$/); // any extn
    if (opts.dotfiles) ignores.push(/\/\.\w/);
    else ignores.push(/\/\.well-known/);
    for (const x of [].concat(opts.ignores || [])) {
      ignores.push(new RegExp(x, "i"));
    }
  }

  let cc = opts.maxAge != null && `public,max-age=${opts.maxAge}`;
  if (cc && opts.immutable) cc += ",immutable";
  else if (cc && opts.maxAge === 0) cc += ",must-revalidate";

  if (!opts.dev) {
    totalist(dir, (name: string, abs: string, stats: fs.Stats) => {
      if (/\.well-known[\\+\/]/.test(name)) {
      } // keep
      else if (!opts.dotfiles && /(^\.|[\\+|\/+]\.)/.test(name)) return;

      const headers = toHeaders(name, stats, isEtag);
      if (cc) headers["Cache-Control"] = cc;

      FILES[`/${name.normalize().replace(/\\+/g, "/")}`] = { abs, stats, headers };
    });
  }

  const lookupFn = opts.dev
    ? (uri: string, extns: string[]) => viaLocal(dir, isEtag, uri, extns)
    : (uri: string, extns: string[]) => viaCache(FILES, uri, extns);

  return createUniversalMiddleware(
    dir,
    isEtag,
    isSPA,
    ignores,
    lookupFn,
    extensions,
    gzips,
    brots,
    setHeaders,
    isNotFound,
    fallback,
  );
}
