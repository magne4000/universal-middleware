import { assert, suite } from "vitest";
import sirv from "../src/index";
import * as utils from "./helpers";

const types = suite("types");

types.test("should export a function", () => {
  assert.typeOf(sirv, "function");
});

types.test("should be usable without arguments", () => {
  assert.typeOf(sirv(), "function"); // traverses ENTIRE repo
});

types.test("should be usable with `dir` argument only", () => {
  assert.typeOf(sirv("tests"), "function");
});

types.test("should be usable with `dir` and `opts` arguments", () => {
  assert.typeOf(sirv("tests", { dev: true }), "function");
});

types.test("should throw error if `dir` is not found", () => {
  assert.throws(() => sirv("foobar"), /ENOENT/);
});

// ---

const basic = suite("basics");

basic.test("should return the file if found", async () => {
  const server = utils.http();

  try {
    const res1 = await server.send("GET", "/bundle.67329.js");
    await utils.matches(res1, 200, "bundle.67329.js", "utf8");

    const res2 = await server.send("GET", "/bundle.a5039.css");
    await utils.matches(res2, 200, "bundle.a5039.css", "utf8");
  } finally {
    server.close();
  }
});

basic.test("should return a 404 response (default) if not found", async () => {
  const server = utils.http();

  try {
    await server.send("GET", "/bundle.js").catch((err) => {
      assert.equal(err.status, 404);
    });

    await server.send("GET", "/bundle.css").catch((err) => {
      assert.equal(err.status, 404);
    });

    await server.send("GET", "/deeper/bundle.js").catch((err) => {
      assert.equal(err.status, 404);
    });
  } finally {
    server.close();
  }
});

// ---

const encode = suite("URI encoding");

encode.test("should work when the request path contains accented characters :: dev", async () => {
  const server = utils.http({ dev: true });

  try {
    const res = await server.send("GET", "/fünke.txt");
    assert.equal(res.headers.get("content-type"), "text/plain");
    assert.equal(await res.text(), "fünke.txt\n");
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});

encode.test("should work when the request path contains encoded characters :: dev", async () => {
  const server = utils.http({ dev: true });

  try {
    const res = await server.send("GET", "/f%C3%BCnke.txt");
    assert.equal(res.headers.get("content-type"), "text/plain");
    assert.equal(await res.text(), "fünke.txt\n");
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});

encode.test("should work when the request path contains accented characters :: prod", async () => {
  const server = utils.http({ dev: false });

  try {
    const res = await server.send("GET", "/fünke.txt");
    assert.equal(res.headers.get("content-type"), "text/plain");
    assert.equal(await res.text(), "fünke.txt\n");
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});

encode.test("should work when the request path contains encoded characters :: prod", async () => {
  const server = utils.http({ dev: false });

  try {
    const res = await server.send("GET", "/f%C3%BCnke.txt");
    assert.equal(res.headers.get("content-type"), "text/plain");
    assert.equal(await res.text(), "fünke.txt\n");
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});

encode.test("should work when the request path contains space encoded :: dev", async () => {
  const server = utils.http({ dev: true });

  try {
    const res = await server.send("GET", "/with%20space.txt");
    assert.equal(res.headers.get("content-type"), "text/plain");
    assert.equal(await res.text(), "with space.txt\n");
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});

encode.test("should work when the request path contains space encoded :: prod", async () => {
  const server = utils.http({ dev: false });

  try {
    const res = await server.send("GET", "/with%20space.txt");
    assert.equal(res.headers.get("content-type"), "text/plain");
    assert.equal(await res.text(), "with space.txt\n");
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});

encode.test('should not treat "/foo%2Fbar.txt" the same as "/foo.bar.txt" path :: dev', async () => {
  const server = utils.http({ dev: true });

  try {
    const res1 = await server.send("GET", "/about/index.htm");
    assert.equal(res1.status, 200);

    const res2 = await server.send("GET", "/about%2Findex.htm").catch((r) => r);
    assert.equal(res2.status, 404);
  } finally {
    server.close();
  }
});

encode.test('should not treat "/foo%2Fbar.txt" the same as "/foo.bar.txt" path :: prod', async () => {
  const server = utils.http({ dev: false });

  try {
    const res1 = await server.send("GET", "/about/index.htm");
    assert.equal(res1.status, 200);

    const res2 = await server.send("GET", "/about%2Findex.htm").catch((r) => r);
    assert.equal(res2.status, 404);
  } finally {
    server.close();
  }
});

// ---

const index = suite("index.html");

index.test('should handle direct "index.html" requests', async () => {
  const server = utils.http();

  try {
    const res = await server.send("GET", "/index.html");
    await utils.matches(res, 200, "index.html", "utf8");
  } finally {
    server.close();
  }
});

index.test('should treat "/" as "/index.html" request', async () => {
  const server = utils.http();

  try {
    const res = await server.send("GET", "/");
    await utils.matches(res, 200, "index.html", "utf8");
  } finally {
    server.close();
  }
});

index.test('should treat "/about" as "/about/index.htm" request', async () => {
  const server = utils.http();

  try {
    const res = await server.send("GET", "/about");
    await utils.matches(res, 200, "about/index.htm", "utf8");
  } finally {
    server.close();
  }
});

index.test('should treat "/contact" as "/contact/index.html" request', async () => {
  const server = utils.http();

  try {
    const res = await server.send("GET", "/contact");
    await utils.matches(res, 200, "contact/index.html", "utf8");
  } finally {
    server.close();
  }
});

index.test('should treat "/blog" as "/blog.html" request', async () => {
  const server = utils.http();

  try {
    const res = await server.send("GET", "/blog");
    await utils.matches(res, 200, "blog.html", "utf8");
  } finally {
    server.close();
  }
});

// ---

const extensions = suite("extensions");

extensions.test("should limit which extensions are assumed for index lookup", async () => {
  const server = utils.http({
    extensions: ["html"],
  });

  try {
    await server.send("GET", "/about").catch((err) => {
      assert.equal(err.status, 404);
    });
  } finally {
    server.close();
  }
});

extensions.test("should extend which extensions are assumed for any request", async () => {
  const server = utils.http({
    extensions: ["js", "css"],
  });

  try {
    const res1 = await server.send("GET", "/bundle.67329");
    await utils.matches(res1, 200, "bundle.67329.js", "utf8");

    const res2 = await server.send("GET", "/bundle.a5039");
    await utils.matches(res2, 200, "bundle.a5039.css", "utf8");
  } finally {
    server.close();
  }
});

// ---

const security = suite("security");

security.test("should prevent directory traversal attacks :: prod", async () => {
  const server = utils.http({ dev: false });

  try {
    await server.send("GET", "/../../package.json");
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  } catch (err: any) {
    assert.equal(err.status, 404);
  } finally {
    server.close();
  }
});

security.test("should prevent directory traversal attacks :: dev", async () => {
  const server = utils.http({ dev: true });

  try {
    await server.send("GET", "/../../package.json");
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  } catch (err: any) {
    assert.equal(err.status, 404);
  } finally {
    server.close();
  }
});

// ---

const single = suite("single");

single.test('should maintain "index.html" assumptions', async () => {
  const server = utils.http({ single: true });

  try {
    const res1 = await server.send("GET", "/");
    await utils.matches(res1, 200, "index.html", "utf8");

    const res2 = await server.send("GET", "/about");
    await utils.matches(res2, 200, "about/index.htm", "utf8");

    const res3 = await server.send("GET", "/contact");
    await utils.matches(res3, 200, "contact/index.html", "utf8");

    const res4 = await server.send("GET", "/blog");
    await utils.matches(res4, 200, "blog.html", "utf8");
  } finally {
    server.close();
  }
});

single.test("should serve assets when requested directly", async () => {
  const server = utils.http({ single: true });

  try {
    const res1 = await server.send("GET", "/bundle.67329.js");
    await utils.matches(res1, 200, "bundle.67329.js", "utf8");

    const res2 = await server.send("GET", "/bundle.a5039.css");
    await utils.matches(res2, 200, "bundle.a5039.css", "utf8");
  } finally {
    server.close();
  }
});

single.test('should serve root "index.html" for paths without assets', async () => {
  const server = utils.http({ single: true });

  try {
    const res1 = await server.send("GET", "/foobar");
    await utils.matches(res1, 200, "index.html", "utf8");

    const res2 = await server.send("GET", "/foo/bar");
    await utils.matches(res2, 200, "index.html", "utf8");

    const res3 = await server.send("GET", "/about/foobar");
    await utils.matches(res3, 200, "index.html", "utf8");
  } finally {
    server.close();
  }
});

single.test("should use custom fallback when `single` is a string", async () => {
  const server = utils.http({ single: "about/index.htm" });

  try {
    const res1 = await server.send("GET", "/foobar");
    await utils.matches(res1, 200, "about/index.htm", "utf8");

    const res2 = await server.send("GET", "/foo/bar");
    await utils.matches(res2, 200, "about/index.htm", "utf8");

    const res3 = await server.send("GET", "/about/foobar");
    await utils.matches(res3, 200, "about/index.htm", "utf8");
  } finally {
    server.close();
  }
});

single.test('should NOT fallback to "index.html" for URLs with extension', async () => {
  const server = utils.http({ single: true });

  try {
    await server.send("GET", "/404.css").catch((err) => {
      assert.equal(err.status, 404);
    });

    await server.send("GET", "/404.js").catch((err) => {
      assert.equal(err.status, 404);
    });

    await server.send("GET", "/foo/bar/baz.bat").catch((err) => {
      assert.equal(err.status, 404);
    });
  } finally {
    server.close();
  }
});

// ---

const ignores = suite("ignores");

ignores.test('should be able to fallback any URL to "index.html" when desired', async () => {
  const server = utils.http({ single: true, ignores: false });

  try {
    const res1 = await server.send("GET", "/404.css");
    await utils.matches(res1, 200, "index.html", "utf8");

    const res2 = await server.send("GET", "/404.js");
    await utils.matches(res2, 200, "index.html", "utf8");

    const res3 = await server.send("GET", "/foo/bar/baz.bat");
    await utils.matches(res3, 200, "index.html", "utf8");
  } finally {
    server.close();
  }
});

ignores.test("should provide custom RegExp pattern to ignore", async () => {
  const server = utils.http({
    single: true,
    ignores: /^[/]foo/,
  });

  try {
    await server.send("GET", "/foo/404").catch((err) => {
      assert.equal(err.status, 404);
    });

    await server.send("GET", "/foobar/baz").catch((err) => {
      assert.equal(err.status, 404);
    });

    await server.send("GET", "/foo/bar/baz").catch((err) => {
      assert.equal(err.status, 404);
    });

    const res = await server.send("GET", "/hello/world");
    await utils.matches(res, 200, "index.html", "utf8");
  } finally {
    server.close();
  }
});

ignores.test("should provide custom String pattern to ignore", async () => {
  const server = utils.http({
    single: true,
    ignores: "^/foo",
  });

  try {
    await server.send("GET", "/foo/404").catch((err) => {
      assert.equal(err.status, 404);
    });

    await server.send("GET", "/foobar/baz").catch((err) => {
      assert.equal(err.status, 404);
    });

    await server.send("GET", "/foo/bar/baz").catch((err) => {
      assert.equal(err.status, 404);
    });

    const res = await server.send("GET", "/hello/world");
    await utils.matches(res, 200, "index.html", "utf8");
  } finally {
    server.close();
  }
});

ignores.test("should provide mulitple RegExp patterns to ignore", async () => {
  const server = utils.http({
    single: true,
    ignores: [/^[/]foo/, /bar/],
  });

  try {
    await server.send("GET", "/foo/404").catch((err) => {
      assert.equal(err.status, 404);
    });

    await server.send("GET", "/hello/bar/baz").catch((err) => {
      assert.equal(err.status, 404);
    });

    const res = await server.send("GET", "/hello/world");
    await utils.matches(res, 200, "index.html", "utf8");
  } finally {
    server.close();
  }
});

ignores.test("should provide mulitple String patterns to ignore", async () => {
  const server = utils.http({
    single: true,
    ignores: ["^/foo", "bar"],
  });

  try {
    await server.send("GET", "/foo/404").catch((err) => {
      assert.equal(err.status, 404);
    });

    await server.send("GET", "/hello/bar/baz").catch((err) => {
      assert.equal(err.status, 404);
    });

    const res = await server.send("GET", "/hello/world");
    await utils.matches(res, 200, "index.html", "utf8");
  } finally {
    server.close();
  }
});

// ---

const dotfiles = suite("dotfiles");

dotfiles.test("should reject hidden files by default (dev: false)", async () => {
  const server = utils.http();

  try {
    await server.send("GET", "/.hello").catch((err) => {
      assert.equal(err.status, 404);
    });

    await server.send("GET", "/foo/.world").catch((err) => {
      assert.equal(err.status, 404);
    });

    await server.send("GET", "/.hello.txt").catch((err) => {
      assert.equal(err.status, 404);
    });
  } finally {
    server.close();
  }
});

dotfiles.test("should reject hidden files by default (dev: true)", async () => {
  const server = utils.http({ dev: true });

  try {
    await server.send("GET", "/.hello").catch((err) => {
      assert.equal(err.status, 404);
    });

    await server.send("GET", "/foo/.world").catch((err) => {
      assert.equal(err.status, 404);
    });

    await server.send("GET", "/.hello.txt").catch((err) => {
      assert.equal(err.status, 404);
    });
  } finally {
    server.close();
  }
});

dotfiles.test("should treat dotfiles with fallback during `single` mode", async () => {
  const server = utils.http({ single: true });

  try {
    const res1 = await server.send("GET", "/.hello");
    await utils.matches(res1, 200, "index.html", "utf8");

    const res2 = await server.send("GET", "/foo/.world");
    await utils.matches(res2, 200, "index.html", "utf8");
  } finally {
    server.close();
  }
});

dotfiles.test('should always allow access to ".well-known" directory contents', async () => {
  const server = utils.http();

  try {
    const res = await server.send("GET", "/.well-known/example");
    await utils.matches(res, 200, ".well-known/example", "utf8");
  } finally {
    server.close();
  }
});

dotfiles.test("should allow requests to hidden files only when enabled", async () => {
  const server = utils.http({ dotfiles: true });

  try {
    const res1 = await server.send("GET", "/.hello");
    await utils.matches(res1, 200, ".hello", "utf8");

    const res2 = await server.send("GET", "/foo/.world");
    await utils.matches(res2, 200, "foo/.world", "utf8");

    const res3 = await server.send("GET", "/.hello.txt");
    await utils.matches(res3, 200, ".hello.txt", "utf8");
  } finally {
    server.close();
  }
});

// ---

const dev = suite("dev");

dev.test("should not rely on initial Cache fill", async () => {
  const server = utils.http({ dev: true });

  try {
    await server.send("GET", "/foo.bar.js").catch((err) => {
      assert.equal(err.status, 404);
    });

    await utils.write("foo.bar.js", "hello there");

    // matches() helper will work but assert here
    const res = await server.send("GET", "/foo.bar.js");
    assert.equal(res.headers.get("content-type"), "text/javascript");
    assert.equal(res.headers.get("content-length"), "11");
    assert.equal(await res.text(), "hello there");
    assert.equal(res.status, 200);
  } finally {
    await utils.remove("foo.bar.js");
    server.close();
  }
});

dev.test("should not rely on file cached data", async () => {
  const server = utils.http({ dev: true });

  try {
    await utils.write("foo.js", "version 1");

    // matches() helper will work but assert here
    const res1 = await server.send("GET", "/foo.js");
    assert.equal(await res1.text(), "version 1");
    assert.equal(res1.status, 200);

    await utils.write("foo.js", "version 2");

    // matches() helper will work but assert here
    const res2 = await server.send("GET", "/foo.js");
    assert.equal(await res2.text(), "version 2");
    assert.equal(res2.status, 200);
  } finally {
    await utils.remove("foo.js");
    server.close();
  }
});

dev.test("should set default `Cache-Control` header value", async () => {
  const server = utils.http({ dev: true });

  try {
    const res1 = await server.send("GET", "/bundle.67329.js");
    assert.equal(res1.headers.get("cache-control"), "no-store");
  } finally {
    server.close();
  }
});

// ---

const etag = suite("etag");

etag.test('should include an "ETag" HTTP header value', async () => {
  const server = utils.http({ etag: true });

  try {
    const res = await server.send("GET", "/bundle.67329.js");
    await utils.matches(res, 200, "bundle.67329.js", "utf8");
    assert.ok(res.headers.get("etag"));
  } finally {
    server.close();
  }
});

etag.test('should be "weak" variant and calculated from file stats', async () => {
  const server = utils.http({ etag: true });

  try {
    const res = await server.send("GET", "/bundle.67329.js");
    const file = await utils.lookup("bundle.67329.js", "utf8");
    assert.equal(res.headers.get("etag"), `W/"${file.size}-${file.mtime}"`);
  } finally {
    server.close();
  }
});

etag.test('should allow "If-None-Match" directive to function', async () => {
  const server = utils.http({ etag: true });

  try {
    const res1 = await server.send("GET", "/bundle.67329.js");
    assert.equal(res1.status, 200, "normal request");

    const headers = { "If-None-Match": res1.headers.get("etag") } as Record<string, string>;
    const res2 = await server.send("GET", "/bundle.67329.js", { headers });
    assert.equal(res2.status, 304, 'send 304 for "no change" signal');
    assert.equal(await res2.text(), "", "send empty response body");
  } finally {
    server.close();
  }
});

etag.test("should force `Cache-Control` header in `dev` mode", async () => {
  const server = utils.http({ etag: true, dev: true });

  try {
    const res1 = await server.send("GET", "/bundle.67329.js");
    assert.equal(res1.headers.get("cache-control"), "no-cache");

    const headers = { "If-None-Match": res1.headers.get("etag") } as Record<string, string>;
    const res2 = await server.send("GET", "/bundle.67329.js", { headers });
    assert.equal(res2.status, 304, 'send 304 for "no change" signal');
    assert.equal(await res2.text(), "", "send empty response body");
  } finally {
    server.close();
  }
});

// ---

const brotli = suite("brotli");

brotli.test('should require "Accept-Encoding" match to do anything', async () => {
  const server = utils.http({ brotli: true });
  const headers = { "Accept-Encoding": "br,gzip" };

  try {
    await server.send("GET", "/data.js").catch((err) => {
      assert.equal(err.status, 404, "does not find plain file");
    });

    // the `matches` helper assumes wrong mime type
    const res = await server.send("GET", "/data.js", { headers });
    assert.equal(res.headers.get("content-type"), "text/javascript");
    assert.equal(res.headers.get("content-encoding"), "br");
    assert.equal(await res.text(), "brotli js file\n");
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});

brotli.test("should serve prepared `.br` file of any asset, if found", async () => {
  const server = utils.http({ brotli: true });
  const headers = { "Accept-Encoding": "br,gzip" };

  try {
    const res1 = await server.send("GET", "/", { headers });
    assert.equal(res1.headers.get("content-type"), "text/html;charset=utf-8");
    assert.equal(res1.headers.get("content-encoding"), "br");
    assert.equal(await res1.text(), "brotli html\n");
    assert.equal(res1.status, 200);

    const res2 = await server.send("GET", "/bundle.67329.js", { headers });
    await utils.matches(res2, 200, "bundle.67329.js", "utf8"); // no brotli
  } finally {
    server.close();
  }
});

brotli.test('should be preferred when "Accept-Encoding" allows both', async () => {
  const server = utils.http({ gzip: true, brotli: true });
  const headers = { "Accept-Encoding": "br,gzip" };

  try {
    const res1 = await server.send("GET", "/", { headers });
    assert.equal(res1.headers.get("content-type"), "text/html;charset=utf-8");
    assert.equal(res1.headers.get("content-encoding"), "br");
    assert.equal(await res1.text(), "brotli html\n");
    assert.equal(res1.status, 200);

    const res2 = await server.send("GET", "/data.js", { headers });
    assert.equal(res2.headers.get("content-type"), "text/javascript");
    assert.equal(res2.headers.get("content-encoding"), "br");
    assert.equal(await res2.text(), "brotli js file\n");
    assert.equal(res2.status, 200);
  } finally {
    server.close();
  }
});

// ---

const gzip = suite("gzip");

gzip.test('should require "Accept-Encoding" match to do anything', async () => {
  const server = utils.http({ gzip: true });
  const headers = { "Accept-Encoding": "br,gzip" };

  try {
    await server.send("GET", "/data.js").catch((err) => {
      assert.equal(err.status, 404, "does not find plain file");
    });

    // the `matches` helper assumes wrong mime type
    const res = await server.send("GET", "/data.js", { headers });
    assert.equal(res.headers.get("content-type"), "text/javascript");
    assert.equal(res.headers.get("content-encoding"), "gzip");
    assert.equal(await res.text(), "gzip js file\n");
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});

gzip.test("should serve prepared `.gz` file of any asset, if found", async () => {
  const server = utils.http({ gzip: true });
  const headers = { "Accept-Encoding": "br,gzip" };

  try {
    const res1 = await server.send("GET", "/", { headers });
    assert.equal(res1.headers.get("content-type"), "text/html;charset=utf-8");
    assert.equal(res1.headers.get("content-encoding"), "gzip");
    assert.equal(await res1.text(), "gzip html\n");
    assert.equal(res1.status, 200);

    const res2 = await server.send("GET", "/bundle.67329.js", { headers });
    await utils.matches(res2, 200, "bundle.67329.js", "utf8"); // no gz
  } finally {
    server.close();
  }
});

gzip.test('should defer to brotli when "Accept-Encoding" allows both', async () => {
  const server = utils.http({ gzip: true, brotli: true });
  const headers = { "Accept-Encoding": "br,gzip" };

  try {
    const res1 = await server.send("GET", "/", { headers });
    assert.equal(res1.headers.get("content-type"), "text/html;charset=utf-8");
    assert.equal(res1.headers.get("content-encoding"), "br");
    assert.equal(await res1.text(), "brotli html\n");
    assert.equal(res1.status, 200);

    const res2 = await server.send("GET", "/data.js", { headers });
    assert.equal(res2.headers.get("content-type"), "text/javascript");
    assert.equal(res2.headers.get("content-encoding"), "br");
    assert.equal(await res2.text(), "brotli js file\n");
    assert.equal(res2.status, 200);
  } finally {
    server.close();
  }
});

// ---

const maxAge = suite("maxAge");

maxAge.test('should set the "Cache-Control" HTTP header value', async () => {
  const server = utils.http({ maxAge: 100 });

  try {
    const res = await server.send("GET", "/bundle.67329.js");
    assert.equal(res.headers.get("cache-control"), "public,max-age=100");
  } finally {
    server.close();
  }
});

maxAge.test("should accept `0` value", async () => {
  const server = utils.http({ maxAge: 0 });

  try {
    const res = await server.send("GET", "/bundle.67329.js");
    assert.equal(res.headers.get("cache-control"), "public,max-age=0,must-revalidate");
  } finally {
    server.close();
  }
});

maxAge.test("should ignore `null` value", async () => {
  const server = utils.http({ maxAge: null });

  try {
    const res = await server.send("GET", "/bundle.67329.js");
    assert.notOk(res.headers.get("cache-control"));
  } finally {
    server.close();
  }
});

// ---

const immutable = suite("immutable");

immutable.test('should append the `immutable` directive to "Cache-Control" header value', async () => {
  const server = utils.http({ maxAge: 1234, immutable: true });

  try {
    const res = await server.send("GET", "/bundle.67329.js");
    assert.equal(res.headers.get("cache-control"), "public,max-age=1234,immutable");
  } finally {
    server.close();
  }
});

immutable.test("should work with `maxAge=0` value", async () => {
  const server = utils.http({ maxAge: 0, immutable: true });

  try {
    const res = await server.send("GET", "/bundle.67329.js");
    assert.equal(res.headers.get("cache-control"), "public,max-age=0,immutable");
  } finally {
    server.close();
  }
});

immutable.test("should not do anything without a `maxAge` option enabled", async () => {
  const server = utils.http({ immutable: true });

  try {
    const res = await server.send("GET", "/bundle.67329.js");
    assert.notOk(res.headers.get("cache-control"));
  } finally {
    server.close();
  }
});

// ---

const ranges = suite("ranges");

ranges.test('should send the requested "Range" slice :: start', async () => {
  const server = utils.http();

  try {
    const headers = { Range: "bytes=0-10" };
    const file = await utils.lookup("bundle.67329.js", "utf8");
    const res = await server.send("GET", "/bundle.67329.js", { headers });

    assert.equal(res.status, 206);
    assert.equal(res.headers.get("content-length"), "11");
    assert.equal(res.headers.get("accept-ranges"), "bytes");
    assert.equal(res.headers.get("content-range"), `bytes 0-10/${file.size}`);
  } finally {
    server.close();
  }
});

ranges.test('should send the requested "Range" slice :: middle', async () => {
  const server = utils.http();

  try {
    const headers = { Range: "bytes=6-96" };
    const file = await utils.lookup("bundle.67329.js", "utf8");
    const res = await server.send("GET", "/bundle.67329.js", { headers });

    assert.equal(res.status, 206);
    assert.equal(res.headers.get("content-length"), "91");
    assert.equal(res.headers.get("accept-ranges"), "bytes");
    assert.equal(res.headers.get("content-range"), `bytes 6-96/${file.size}`);
  } finally {
    server.close();
  }
});

ranges.test('should send the requested "Range" slice :: end', async () => {
  const server = utils.http();

  try {
    const headers = { Range: "bytes=80-115" };
    const file = await utils.lookup("bundle.67329.js", "utf8");
    const res = await server.send("GET", "/bundle.67329.js", { headers });

    assert.equal(res.status, 206);
    assert.equal(res.headers.get("content-length"), "36");
    assert.equal(res.headers.get("accept-ranges"), "bytes");
    assert.equal(res.headers.get("content-range"), `bytes 80-115/${file.size}`);
  } finally {
    server.close();
  }
});

ranges.test('should send the requested "Range" slice :: full', async () => {
  const server = utils.http();

  try {
    const headers = { Range: "bytes=0-115" };
    const file = await utils.lookup("bundle.67329.js", "utf8");
    const res = await server.send("GET", "/bundle.67329.js", { headers });

    assert.equal(res.status, 206);
    assert.equal(res.headers.get("content-length"), "116");
    assert.equal(res.headers.get("accept-ranges"), "bytes");
    assert.equal(res.headers.get("content-range"), `bytes 0-115/${file.size}`);
  } finally {
    server.close();
  }
});

ranges.test("should assume the end-value is final byte when not included", async () => {
  const server = utils.http();

  try {
    const headers = { Range: "bytes=2" };
    const file = await utils.lookup("bundle.67329.js", "utf8");
    const res = await server.send("GET", "/bundle.67329.js", { headers });

    assert.equal(res.status, 206);
    assert.equal(res.headers.get("content-length"), "114");
    assert.equal(res.headers.get("accept-ranges"), "bytes");
    assert.equal(res.headers.get("content-range"), `bytes 2-115/${file.size}`);
  } finally {
    server.close();
  }
});

ranges.test("should assume the end-value is final byte when not included :: full", async () => {
  const server = utils.http();

  try {
    const headers = { Range: "bytes=0" };
    const file = await utils.lookup("bundle.67329.js", "utf8");
    const res = await server.send("GET", "/bundle.67329.js", { headers });

    assert.equal(res.status, 206);
    assert.equal(res.headers.get("content-length"), "116");
    assert.equal(res.headers.get("accept-ranges"), "bytes");
    assert.equal(res.headers.get("content-range"), `bytes 0-115/${file.size}`);
  } finally {
    server.close();
  }
});

ranges.test("should throw `416` when range start cannot be met (overflow)", async () => {
  const server = utils.http();

  try {
    const headers = { Range: "bytes=123456-234567" };
    const file = await utils.lookup("bundle.67329.js", "utf8");
    await server.send("GET", "/bundle.67329.js", { headers }).catch((err) => {
      assert.equal(err.headers.get("content-range"), `bytes */${file.size}`);
      assert.equal(err.status, 416);
    });
  } finally {
    server.close();
  }
});

ranges.test("should shrink range end if it cannot be met (overflow)", async () => {
  const server = utils.http();

  try {
    const headers = { Range: "bytes=10-123456" };
    const file = await utils.lookup("bundle.67329.js", "utf8");
    const res = await server.send("GET", "/bundle.67329.js", { headers });
    assert.equal(res.headers.get("content-range"), `bytes 10-${file.size - 1}/${file.size}`);
    assert.equal(res.status, 206);
  } finally {
    server.close();
  }
});

ranges.test("should not mutate response headers on subsequent non-Range requests :: dev", async () => {
  const server = utils.http({ dev: true });

  try {
    const file = await utils.lookup("bundle.67329.js", "utf8");

    const headers = { Range: "bytes=0-10" };
    const res1 = await server.send("GET", "/bundle.67329.js", { headers });
    assert.ok(res1.headers.get("content-range"));
    assert.ok(res1.headers.get("accept-ranges"));

    const res2 = await server.send("GET", "/bundle.67329.js");
    assert.equal(res2.status, 200);
    assert.equal(res2.headers.get("content-length"), `${file.size}`);
    assert.notOk(res2.headers.get("content-range"));
    assert.notOk(res2.headers.get("accept-ranges"));
  } finally {
    server.close();
  }
});

ranges.test("should not mutate response headers on subsequent non-Range requests :: prod", async () => {
  const server = utils.http({ dev: false });

  try {
    const file = await utils.lookup("bundle.67329.js", "utf8");

    const headers = { Range: "bytes=0-10" };
    const res1 = await server.send("GET", "/bundle.67329.js", { headers });
    assert.ok(res1.headers.get("content-range"));
    assert.ok(res1.headers.get("accept-ranges"));

    const res2 = await server.send("GET", "/bundle.67329.js");
    assert.equal(res2.status, 200);
    assert.equal(res2.headers.get("content-length"), `${file.size}`);
    assert.notOk(res2.headers.get("content-range"));
    assert.notOk(res2.headers.get("accept-ranges"));
  } finally {
    server.close();
  }
});

// ---

const setHeaders = suite("setHeaders");

setHeaders.test("should be able to set new response headers", async () => {
  const server = utils.http({
    setHeaders(res) {
      res.headers.set("x-foo", "bar");
    },
  });

  try {
    const res = await server.send("GET", "/sw.js");
    assert.equal(res.headers.get("x-foo"), "bar");
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});

setHeaders.test('should be able to customize "Content-Type" header', async () => {
  const server = utils.http({
    setHeaders(res) {
      res.headers.set("Content-Type", "text/foobar");
    },
  });

  try {
    const res = await server.send("GET", "/sw.js");
    assert.equal(res.headers.get("content-type"), "text/foobar");
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});

setHeaders.test('should be able to customize "Cache-Control" header', async () => {
  const server = utils.http({
    maxAge: 100,
    immutable: true,
    setHeaders(res) {
      res.headers.set("Cache-Control", "private,foobar");
    },
  });

  try {
    const res = await server.send("GET", "/sw.js");
    assert.equal(res.headers.get("cache-control"), "private,foobar");
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});

setHeaders.test('should be able to customize "Last-Modified" header', async () => {
  const server = utils.http({
    etag: true,
    setHeaders(res) {
      res.headers.set("Last-Modified", "hello world");
    },
  });

  try {
    const res = await server.send("GET", "/sw.js");
    assert.equal(res.headers.get("last-modified"), "hello world");
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});

setHeaders.test('should receive "path" argument', async () => {
  const server = utils.http({
    setHeaders(res, path) {
      res.headers.set("Cache-Control", path === "/sw.js" ? "private" : "public");
    },
  });

  try {
    const res1 = await server.send("GET", "/sw.js");
    assert.equal(res1.headers.get("cache-control"), "private");
    await utils.matches(res1, 200, "sw.js", "utf8");

    const res2 = await server.send("GET", "/test.svg");
    assert.equal(res2.headers.get("cache-control"), "public");
    await utils.matches(res2, 200, "test.svg", "utf8");
  } finally {
    server.close();
  }
});

setHeaders.test('should receive "stats" argument', async () => {
  const server = utils.http({
    setHeaders(res, path, stats) {
      res.headers.set("x-filesize", String(stats.size));
    },
  });

  try {
    const res = await server.send("GET", "/sw.js");
    const file = await utils.lookup("sw.js", "utf8");
    assert.equal(res.headers.get("x-filesize"), String(file.size));
  } finally {
    server.close();
  }
});

// ---

const onNoMatch = suite("onNoMatch");

onNoMatch.test("should be called instead of default 404 response", async () => {
  const server = utils.http({
    onNoMatch() {
      const res = new Response("not found");
      res.headers.set("x-foo", "bar");
      return res;
    },
  });

  try {
    const res = await server.send("GET", "/1234");
    assert.equal(res.headers.get("x-foo"), "bar");
    assert.equal(await res.text(), "not found");
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});
