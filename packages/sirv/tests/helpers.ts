import { readFile, stat, unlink, writeFile } from "node:fs/promises";
import { createServer, type IncomingHttpHeaders, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMiddleware } from "@universal-middleware/express";
import * as mime from "mrmime";
import { assert } from "vitest";
import sirv, { type ServeOptions } from "../src/middleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const www = join(__dirname, "public");

export const setup = (opts: ServeOptions = {}) => sirv(www, opts);

export function http(opts: ServeOptions = {}) {
  const server = createServer(createMiddleware(() => setup(opts))());
  const address = new URL(listen(server));
  return {
    close: server.close.bind(server),
    send(method: string, path: string, opts?: RequestInit) {
      const uri = new URL(path, address);
      return fetch(uri, {
        method,
        window: null,
        redirect: "error",
        ...opts,
      });
    },
    get address() {
      return address;
    },
  };
}

export function listen(server: Server) {
  server.listen(); // boots
  const { port } = server.address() as AddressInfo;
  return `http://localhost:${port}`;
}

/**
 * Issues a request with `node:http` and returns the raw response bytes.
 *
 * `fetch` validates the response against its own framing rules and rejects when
 * the body does not match `Content-Length`, which hides the very mismatch some
 * tests need to observe. This helper reports whatever reached the client.
 */
export function sendRaw(
  address: URL,
  method: string,
  path: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; headers: IncomingHttpHeaders; body: Buffer; error?: Error }> {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: address.hostname, port: Number(address.port), path, method, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      const settle = (error?: Error) =>
        resolve({
          status: res.statusCode as number,
          headers: res.headers,
          body: Buffer.concat(chunks),
          error,
        });
      res.on("end", () => settle());
      // A truncated/aborted response still carries the evidence we assert on.
      res.on("error", settle);
      res.on("aborted", () => settle(new Error("response aborted")));
    });

    req.on("error", reject);
    req.end();
  });
}

const CACHE: Record<
  string,
  {
    data: string;
    size: number;
    type: string;
    mtime: number;
  }
> = {};

export async function lookup(filepath: string, enc: BufferEncoding) {
  if (CACHE[filepath]) return CACHE[filepath];

  const full = join(www, filepath);
  const stats = await stat(full);
  const filedata = await readFile(full, enc);

  let ctype = mime.lookup(full) || "";
  if (ctype === "text/html") ctype += ";charset=utf-8";

  CACHE[filepath] = {
    data: filedata,
    size: stats.size,
    type: ctype,
    mtime: stats.mtime.getTime(),
  };

  return CACHE[filepath];
}

export async function matches(res: Response, code: number, filepath: string, enc: BufferEncoding) {
  const file = await lookup(filepath, enc);
  assert.equal(res.headers.get("content-length"), String(file.size));
  assert.equal(res.headers.get("content-type"), file.type);
  assert.equal(res.status, code);
  assert.equal(await res.text(), file.data);
}

export async function write(file: string, data: string) {
  const filename = join(www, file);
  await writeFile(filename, data);
  return filename;
}

export async function remove(file: string) {
  const filename = join(www, file);
  await unlink(filename);
}
