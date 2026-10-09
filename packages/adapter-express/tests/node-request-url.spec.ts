import { createServer, type Server } from "node:http";
import { type AddressInfo, connect } from "node:net";
import type { UniversalHandler } from "@universal-middleware/core";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHandler } from "../src/index.js";

// The request URL was the Host header pasted in front of the target, so a Host that holds a `/`, `?` or `#` changed
// the path the universal handler saw: Express routed `/public` while the handler got `/admin`.

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
  vi.restoreAllMocks();
});

const echoesUrl: UniversalHandler = (request) => new Response(request.url);

async function listen(handler: Parameters<typeof createServer>[1]): Promise<number> {
  const s = createServer(handler);
  await new Promise<void>((resolve) => s.listen(0, resolve));
  server = s;
  return (s.address() as AddressInfo).port;
}

/** Sends `head` as is: fetch would normalize the target and refuses to set Host */
async function send(port: number, head: string): Promise<{ status: number; body: string }> {
  const socket = connect(port, "localhost");
  socket.write(`${head}\r\nconnection: close\r\n\r\n`);
  let response = "";
  for await (const chunk of socket) response += chunk;
  const [statusLine, ...rest] = response.split("\r\n");
  const body = rest.join("\r\n").split("\r\n\r\n").slice(1).join("\r\n\r\n");
  return { status: Number(statusLine.split(" ")[1]), body };
}

function guardedApp(): express.Express {
  const app = express();
  app.use("/admin", (_req, res) => res.status(403).send("guarded"));
  app.use(createHandler(() => echoesUrl)());
  return app;
}

describe("request URL", () => {
  it.each(["x/admin?", "x/admin#", "real.example@evil.test", "x\\admin"])(
    "answers Host %j with 400 instead of a URL with another path",
    async (host) => {
      const port = await listen(guardedApp());
      const { status } = await send(port, `GET /public HTTP/1.1\r\nhost: ${host}`);
      expect(status).toBe(400);
    },
  );

  it("takes the host and path of an absolute-form target", async () => {
    const port = await listen(guardedApp());
    const { status, body } = await send(port, "GET http://target.example/p?q=1 HTTP/1.1\r\nhost: other.example");
    expect(status).toBe(200);
    expect(body).toContain("http://target.example/p?q=1");
  });

  it("answers OPTIONS * with 400", async () => {
    const port = await listen(guardedApp());
    const { status } = await send(port, "OPTIONS * HTTP/1.1\r\nhost: real.example");
    expect(status).toBe(400);
  });

  it("answers 400, without logging, when the handler has no next", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const port = await listen(createHandler(() => echoesUrl)());
    const { status } = await send(port, "GET /public HTTP/1.1\r\nhost: x/admin?");
    expect(status).toBe(400);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
