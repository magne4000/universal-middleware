import { describe, expect, it } from "vitest";
import compressMiddleware from "../src/middleware";

function compress(options: Parameters<typeof compressMiddleware>[0], contentLength: number) {
  const request = new Request("http://localhost", { headers: { "Accept-Encoding": "gzip" } });
  const response = new Response("a".repeat(contentLength), {
    headers: { "Content-Type": "text/plain", "Content-Length": String(contentLength) },
  });
  return compressMiddleware(options)(request)(response);
}

describe("compress middleware :: threshold option", () => {
  it("should compress a body above a custom threshold lower than the default", async () => {
    const output = await compress({ threshold: 100 }, 500);

    expect(output.headers.get("Content-Encoding")).toBe("gzip");
  });

  it("should not compress a body below a custom threshold higher than the default", async () => {
    const output = await compress({ threshold: 4096 }, 2048);

    expect(output.headers.get("Content-Encoding")).toBeNull();
  });

  it("should default to a 1024 bytes threshold", async () => {
    expect((await compress(undefined, 500)).headers.get("Content-Encoding")).toBeNull();
    expect((await compress(undefined, 2048)).headers.get("Content-Encoding")).toBe("gzip");
  });
});
