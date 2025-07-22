import { readFile, stat, unlink, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { createMiddleware } from "@universal-middleware/express";
import * as mime from "mrmime";
import sirv, { type ServeOptions } from "../src/middleware";
import { assert } from "vitest";

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
  };
}

export function listen(server: Server) {
  server.listen(); // boots
  const { port } = server.address() as AddressInfo;
  return `http://localhost:${port}`;
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
