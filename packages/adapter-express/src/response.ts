/* eslint-disable @typescript-eslint/ban-ts-comment,@typescript-eslint/no-explicit-any */

import type { OutgoingHttpHeaders, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { ReadableStream as ReadableStreamNode } from "node:stream/web";
import type { Awaitable } from "./types.js";
import {
  type DecoratedServerResponse,
  pendingMiddlewaresSymbol,
  wrappedResponseSymbol,
} from "./common.js";

export function writableStreamFactory(nodeResponse: ServerResponse) {
  return async (
    res: Response,
    middlewares?: ((response: Response) => Awaitable<Response>)[],
  ) => {
    if (middlewares) {
      res = await middlewares?.reduce(
        async (prev, curr) => curr(await prev),
        Promise.resolve(res),
      );
    }

    return new WritableStream({
      async start() {
        nodeResponse.writeHead(
          res.status,
          res.statusText,
          Object.fromEntries(res.headers.entries()),
        );
      },
      write(chunk) {
        nodeResponse.write(chunk);
      },
      close() {
        nodeResponse.end();
      },
      abort(err) {
        nodeResponse.end(err);
      },
    });
  };
}

export function wrapResponse(nodeResponse: DecoratedServerResponse) {
  if (nodeResponse[wrappedResponseSymbol]) return;
  nodeResponse[wrappedResponseSymbol] = true;

  const originalWrite = nodeResponse.write;
  const originalEnd = nodeResponse.end;
  const originalWriteHead = nodeResponse.writeHead;
  let resolve: () => void;
  const pendingResponse: Promise<void> = new Promise((r) => (resolve = r));

  async function triggerPendingMiddlewares() {
    if (nodeResponse[pendingMiddlewaresSymbol]) {
      const response = await nodeResponse[pendingMiddlewaresSymbol].reduce(
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
      nodeResponse.write = originalWrite;
      nodeResponse.end = originalEnd;
      nodeResponse.writeHead = originalWriteHead;
    } else {
      await pendingResponse;
    }
  }

  (nodeResponse.write as any) = async (...args: any) => {
    await triggerPendingMiddlewares();
    return originalWrite.apply(nodeResponse, args);
  };

  (nodeResponse.end as any) = async (...args: any) => {
    await triggerPendingMiddlewares();
    return originalEnd.apply(nodeResponse, args);
  };

  (nodeResponse.writeHead as any) = async (...args: any) => {
    await triggerPendingMiddlewares();
    return originalWriteHead.apply(nodeResponse, args);
  };
}

/**
 * Send a fetch API Response into a Node.js HTTP response stream.
 */
export async function sendResponse(
  fetchResponse: Response,
  nodeResponse: DecoratedServerResponse,
): Promise<void> {
  const fetchBody: unknown = fetchResponse.body;

  let body: Readable | null = null;
  if (fetchBody instanceof Readable) {
    body = fetchBody;
  } else if (
    fetchBody instanceof ReadableStream ||
    (fetchBody as any) instanceof ReadableStreamNode
  ) {
    body = Readable.fromWeb(fetchBody as ReadableStreamNode);
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
