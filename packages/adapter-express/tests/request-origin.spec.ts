import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { UniversalHandler, UniversalMiddleware } from "@universal-middleware/core";
import express from "express";
import express4 from "express4";
import { afterEach, describe, expect, it } from "vitest";
import { apply, createHandler, createMiddleware } from "../src/index.js";

// The request URL took its protocol from Express (`req.protocol` follows `trust proxy`) but its host from the `Host`
// header, so behind a proxy the URL mixed the public protocol with the internal host.

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

const echoesUrl: UniversalHandler = (request) => new Response(request.url);
const keepsResponse: UniversalMiddleware = () => (response: Response) => response;

const behindProxy = { "x-forwarded-proto": "https", "x-forwarded-host": "public.example, internal-lb" };

async function listen(app: express.Express): Promise<string> {
  const s = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  server = s;
  return `http://localhost:${(s.address() as AddressInfo).port}`;
}

describe.each([
  ["Express 5", () => express()],
  // Express 4's `req.host` drops the port, so the host isn't taken from it
  ["Express 4", () => express4() as unknown as express.Express],
])("request URL with %s", (_, createApp) => {
  it("has the public protocol and host when trust proxy trusts the proxy", async () => {
    const app = createApp();
    app.set("trust proxy", true);
    app.get("/p", createHandler(() => echoesUrl)());
    const url = await listen(app);
    const res = await fetch(`${url}/p`, { headers: behindProxy });
    expect(await res.text()).toBe("https://public.example/p");
  });

  it("keeps the Host header when trust proxy doesn't trust the proxy", async () => {
    const app = createApp();
    app.get("/p", createHandler(() => echoesUrl)());
    const url = await listen(app);
    const res = await fetch(`${url}/p`, { headers: behindProxy });
    expect(await res.text()).toBe(`${url}/p`);
  });

  it("redirects a response function's relative Location to the public origin", async () => {
    const app = createApp();
    app.set("trust proxy", true);
    app.use(createMiddleware(() => keepsResponse)());
    app.get("/p", (_req, res) => res.redirect("/login"));
    const url = await listen(app);
    const res = await fetch(`${url}/p`, { headers: behindProxy, redirect: "manual" });
    expect(res.headers.get("location")).toBe("https://public.example/login");
  });
});

describe("apply options", () => {
  it("are passed to every middleware and handler", async () => {
    const seen: string[] = [];
    const recordsUrl: UniversalMiddleware = (request) => {
      seen.push(request.url);
    };
    const app = express();
    apply(app, [recordsUrl, echoesUrl], { origin: "https://example.com" });
    const url = await listen(app);
    const res = await fetch(`${url}/p`);
    expect(await res.text()).toBe("https://example.com/p");
    expect(seen).toEqual(["https://example.com/p"]);
  });

  it("set the origin a response function's redirect goes to", async () => {
    const app = express();
    apply(app, [keepsResponse], { origin: "https://example.com" });
    app.get("/p", (_req, res) => res.redirect("/login"));
    const url = await listen(app);
    const res = await fetch(`${url}/p`, { redirect: "manual" });
    expect(res.headers.get("location")).toBe("https://example.com/login");
  });
});
