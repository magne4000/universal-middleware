import { describe, expect, it } from "vitest";
import { handleCompression } from "../src/response";
import { decompressResponse } from "./utils";

const hugeStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".repeat(2 * 1024 * 1024);

describe.each([{ encoding: "gzip" }, { encoding: "deflate" }, { encoding: "br" }] as const)(
  "handleCompression: encoding: $encoding",
  ({ encoding }) => {
    it("should not compress again if input is compressed already", async () => {
      const input = new Response("Test Response");
      input.headers.set("Content-Encoding", "x-my-compressor");

      const output = await handleCompression(encoding, input);

      expect(output).toBeInstanceOf(Response);
      expect(output).toBe(input);
      expect(output.headers.get("Content-Encoding")).toBe(input.headers.get("Content-Encoding"));
    });

    it('should set "Vary": Accept-Encoding if not present on intermediate Response', async () => {
      const input = new Response("Test Response");

      const output = await handleCompression(encoding, input);

      expect(output).toBeInstanceOf(Response);
      expect(output).not.toBe(input);
      expect(output.headers.get("Content-Encoding")).toStrictEqual(encoding);
      expect(output.headers.get("Vary")).toStrictEqual("Accept-Encoding");
      expect(output.headers.get("Content-Length")).toBeNull();

      if (encoding !== "br") {
        await expect(decompressResponse(output, encoding)).resolves.toBe("Test Response");
      }
    });

    it('should append Accept-Encoding to "Vary" header if already present on intermediate Response', async () => {
      const input = new Response("Test Response");
      input.headers.set("Vary", "x-funky");

      const output = await handleCompression(encoding, input);

      expect(output).toBeInstanceOf(Response);
      expect(output).not.toBe(input);
      expect(output.headers.get("Content-Encoding")).toStrictEqual(encoding);
      expect(output.headers.get("Vary")).to.include("x-funky");
      expect(output.headers.get("Vary")).to.include("Accept-Encoding");
      expect(output.headers.get("Content-Length")).toBeNull();
    });

    it("should fall back to status and status text of intermediate Response if neither is provided as options", async () => {
      const input = new Response("Test Response", { status: 418, statusText: "I'm a teapot" });

      const output = await handleCompression(encoding, input);

      expect(output).toBeInstanceOf(Response);
      expect(output).not.toBe(input);
      expect(output.headers.get("Content-Encoding")).toStrictEqual(encoding);
      expect(output.status).toStrictEqual(input.status);
      expect(output.status).toStrictEqual(418);
      expect(output.statusText).toStrictEqual(input.statusText);
      expect(output.statusText).toStrictEqual("I'm a teapot");
      expect(output.headers.get("Content-Length")).toBeNull();
    });

    it("should properly set status and status text if provided as options and override the values from intermediate Response", async () => {
      const input = new Response("Test Response", { status: 418, statusText: "I'm a teapot" });
      const options = { status: 202, statusText: "Accepted" };

      const output = await handleCompression(encoding, input, options);

      expect(output).toBeInstanceOf(Response);
      expect(output).not.toBe(input);
      expect(output.headers.get("Content-Encoding")).toStrictEqual(encoding);
      expect(output.status).not.toStrictEqual(input.status);
      expect(output.status).toStrictEqual(options.status);
      expect(output.status).toStrictEqual(202);
      expect(output.statusText).not.toStrictEqual(input.statusText);
      expect(output.statusText).toStrictEqual(options.statusText);
      expect(output.statusText).toStrictEqual("Accepted");
      expect(output.headers.get("Content-Length")).toBeNull();
    });

    it("should not compress an empty body but still return new Response object", async () => {
      const input = new Response();

      const output = await handleCompression(encoding, input);

      expect(output).toBeInstanceOf(Response);
      expect(output).not.toBe(input);
      expect(output.headers.get("Content-Encoding")).toBeNull();
    });

    it("should compress large body", async () => {
      const input = new Response(hugeStr);

      const output = await handleCompression(encoding, input);

      expect(output).toBeInstanceOf(Response);
      expect(output.headers.get("Content-Encoding")).toStrictEqual(encoding);
      expect(output.headers.get("Content-Length")).toBeNull();

      if (encoding !== "br") {
        await expect(decompressResponse(output, encoding)).resolves.toBe(hugeStr);
      }
    }, 10000);
  },
);
