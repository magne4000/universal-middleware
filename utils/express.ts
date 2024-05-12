import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";

export function fromExpress(req: ExpressRequest): Request {
  const fullUrl = req.protocol + "://" + req.get("host") + req.originalUrl;
  return new Request(fullUrl, {
    // TODO set-cookies special case
    headers: req.headers as Record<string, string>,
    body: req.body,
    method: req.method,
  });
}

export function toExpress(res: Response) {
  return (expressRes: ExpressResponse) => {
    if (!res.body) {
      expressRes.end();
      return Promise.resolve();
    }
    return res.body.pipeTo(
      new WritableStream({
        start() {
          expressRes.writeHead(
            res.status,
            Object.fromEntries(res.headers.entries()),
          );
        },
        write(chunk) {
          expressRes.write(chunk);
        },
        close() {
          expressRes.end();
        },
        abort(err) {
          expressRes.end(err);
        },
      }),
    );
  };
}
