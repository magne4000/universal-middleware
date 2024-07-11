/* eslint-disable @typescript-eslint/no-explicit-any */

import type { OutgoingHttpHeaders, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import type { ReadableStream as ReadableStreamNode } from "node:stream/web";
import {
  type DecoratedServerResponse,
  pendingMiddlewaresSymbol,
  wrappedResponseSymbol,
} from "./common.js";

// @ts-ignore
const deno = typeof Deno !== "undefined";

/**
 * Send a fetch API Response into a Node.js HTTP response stream.
 */
export async function sendResponse(
  fetchResponse: Response,
  nodeResponse: DecoratedServerResponse,
): Promise<void> {
  const fetchBody: unknown = fetchResponse.body;

  let body: Readable | null = null;
  if (typeof (fetchBody as any).pipe === "function") {
    body = fetchBody as Readable;
  } else if (typeof (fetchBody as any).pipeTo === "function") {
    if (!deno && Readable.fromWeb) {
      body = Readable.fromWeb(fetchBody as ReadableStreamNode);
    } else {
      const reader = (fetchBody as ReadableStream).getReader();
      body = new Readable({
        async read() {
          const { done, value } = await reader.read();
          this.push(done ? null : value);
        },
      });
    }
  } else if (fetchBody) {
    body = Readable.from(fetchBody as any);
  }

  setHeaders(fetchResponse, nodeResponse);

  if (body) {
    body.pipe(nodeResponse);
    await new Promise((resolve, reject) => {
      body.on("error", reject);
      nodeResponse.on("finish", resolve);
      nodeResponse.on("error", reject);
    });
  } else {
    nodeResponse.setHeader("content-length", "0");
    nodeResponse.end();
  }
}

function override<T extends DecoratedServerResponse>(
  nodeResponse: T,
  key: keyof T,
  callback: () => Promise<unknown>,
) {
  const original: any = nodeResponse[key];

  (nodeResponse as any)[key] = async (...args: any) => {
    await callback();
    return original.apply(nodeResponse, args);
  };

  return function restore() {
    nodeResponse[key] = original;
  };
}

export function wrapResponse(nodeResponse: DecoratedServerResponse) {
  if (nodeResponse[wrappedResponseSymbol]) return;
  nodeResponse[wrappedResponseSymbol] = true;

  const restore = [
    override(nodeResponse, "write", triggerPendingMiddlewares),
    override(nodeResponse, "end", triggerPendingMiddlewares),
    override(nodeResponse, "writeHead", triggerPendingMiddlewares),
  ];
  let resolve: () => void;
  const pendingResponse: Promise<void> = new Promise((r) => (resolve = r));

  async function triggerPendingMiddlewares() {
    if (nodeResponse[pendingMiddlewaresSymbol]) {
      const middlewares = nodeResponse[pendingMiddlewaresSymbol];
      delete nodeResponse[pendingMiddlewaresSymbol];
      const response = await middlewares.reduce(
        async (prev, curr) => curr(await prev),
        Promise.resolve(
          new Response(null, {
            status: nodeResponse.statusCode,
            statusText: nodeResponse.statusMessage,
            headers: adaptHeaders(nodeResponse.getHeaders()),
          }),
        ),
      );

      if (response.body) {
        throw new Error(
          "Replacing the Response body is currently not supported for connect-like servers",
        );
      }

      setHeaders(response, nodeResponse, true);

      resolve();
      restore.forEach((r) => r());
    } else {
      await pendingResponse;
    }
  }
}

function setHeaders(
  fetchResponse: Response,
  nodeResponse: ServerResponse,
  mirror = false,
) {
  nodeResponse.statusCode = fetchResponse.status;
  if (fetchResponse.statusText) {
    nodeResponse.statusMessage = fetchResponse.statusText;
  }

  const nodeResponseHeaders = new Set(Object.keys(nodeResponse.getHeaders()));

  const setCookie = fetchResponse.headers.getSetCookie();
  for (const cookie of setCookie) {
    nodeResponse.appendHeader("set-cookie", cookie);
  }

  fetchResponse.headers.forEach((value, key) => {
    nodeResponseHeaders.delete(key);
    if (key === "set-cookie") return;
    nodeResponse.setHeader(key, value);
  });

  if (mirror) {
    // delete remaining node headers
    nodeResponseHeaders.forEach((key) => nodeResponse.removeHeader(key));
  }
}

function adaptHeaders(nodeHeaders: OutgoingHttpHeaders): [string, string][] {
  const headers: [string, string][] = [];

  const keys = Object.keys(nodeHeaders);
  for (const key of keys) {
    headers.push([key, normalizeHttpHeader(nodeHeaders[key])]);
  }

  return headers;
}

function normalizeHttpHeader(
  value: string | string[] | number | undefined,
): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return (value as string) || "";
}
