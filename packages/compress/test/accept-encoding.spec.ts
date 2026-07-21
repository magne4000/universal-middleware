import { describe, expect, it } from "vitest";
import { EncodingGuesser } from "../src/compress";
import { chooseBestEncoding } from "../src/encoding-header";

// `chooseBestEncoding` parses the quality values but never filters on them, so
// an encoding the client explicitly refused can still win the negotiation.
// RFC 9110 §12.5.3: "a qvalue of 0 means 'not acceptable'".
//
// Ported from the negotiation fixes in srvx#252.

function req(acceptEncoding: string): Request {
  return new Request("http://localhost", { headers: { "Accept-Encoding": acceptEncoding } });
}

describe("chooseBestEncoding :: q=0 is a refusal", () => {
  it("should not pick an encoding that was refused outright", () => {
    expect(chooseBestEncoding(req("gzip;q=0"), ["gzip", "deflate"])).not.toBe("gzip");
  });

  it("should not pick brotli when brotli was refused", () => {
    expect(chooseBestEncoding(req("br;q=0"), ["br", "gzip"])).not.toBe("br");
  });

  it("should pick the acceptable encoding when another is refused", () => {
    expect(chooseBestEncoding(req("br;q=0, gzip"), ["br", "gzip"])).toBe("gzip");
  });

  it("should treat `identity;q=0, gzip;q=0` as no acceptable encoding", () => {
    const chosen = chooseBestEncoding(req("identity;q=0, gzip;q=0"), ["gzip", "deflate"]);
    expect(chosen === undefined || chosen === null || chosen === "identity").toBe(true);
  });
});

describe("chooseBestEncoding :: the wildcard", () => {
  it("matches a coding the header does not name", () => {
    expect(chooseBestEncoding(req("*"), ["gzip", "deflate"])).toBe("gzip");
  });

  it("loses to a coding the header names explicitly", () => {
    expect(chooseBestEncoding(req("deflate;q=1, *;q=0.5"), ["gzip", "deflate"])).toBe("deflate");
  });

  it("does not revive a coding that was refused explicitly", () => {
    expect(chooseBestEncoding(req("gzip;q=0, *"), ["gzip", "deflate"])).toBe("deflate");
  });

  it("refuses everything unnamed when the wildcard itself is refused", () => {
    expect(chooseBestEncoding(req("*;q=0"), ["gzip", "deflate"])).toBeUndefined();
  });
});

describe("EncodingGuesser :: q=0 is a refusal", () => {
  it("should not compress when the only offered encoding was refused", () => {
    expect(new EncodingGuesser(req("gzip;q=0")).encoding).toBeNull();
  });

  it("should still compress with an encoding that was not refused", () => {
    expect(new EncodingGuesser(req("br;q=0, gzip")).encoding).toBe("gzip");
  });

  it("should compress when the client accepts any encoding", () => {
    expect(new EncodingGuesser(req("*")).encoding).not.toBeNull();
  });
});
