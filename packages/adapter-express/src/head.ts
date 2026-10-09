import type { OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from "node:http";

/** Sets on `res` the status, status message and headers a `res.writeHead()` call carries, without sending them */
export function setHead(
  res: ServerResponse,
  statusCode: number,
  statusMessage?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
  headers?: OutgoingHttpHeaders | OutgoingHttpHeader[],
): void {
  res.statusCode = statusCode;
  if (typeof statusMessage === "string") res.statusMessage = statusMessage;
  else headers ??= statusMessage;
  if (Array.isArray(headers)) {
    // A flat [name, value, …] list replaces the headers it names, and may repeat a name
    for (let i = 0; i < headers.length; i += 2) res.removeHeader(String(headers[i]));
    for (let i = 0; i < headers.length; i += 2) {
      const value = headers[i + 1];
      res.appendHeader(String(headers[i]), typeof value === "number" ? String(value) : value);
    }
  } else if (headers) {
    for (const [name, value] of Object.entries(headers)) {
      if (value !== undefined) res.setHeader(name, value);
    }
  }
}
