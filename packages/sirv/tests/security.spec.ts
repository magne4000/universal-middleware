import { symlinkSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assert, describe, test } from "vitest";
import * as utils from "./helpers";

// The equivalent assertions in sirv.spec.ts are written as
// `send(...).catch((err) => assert.equal(err.status, 404))`; `fetch` resolves for
// any HTTP status, so that callback never runs and those tests pass whatever the
// server does. These assert on the status directly. Ported from srvx#252.

const __dirname = dirname(fileURLToPath(import.meta.url));
const www = join(__dirname, "public");

describe("dotfiles :: dev", () => {
  test("should reject a bare dotfile", async () => {
    const server = utils.http({ dev: true });

    try {
      const res = await server.send("GET", "/.hello");
      assert.equal(res.status, 404);
    } finally {
      server.close();
    }
  });

  test("should reject a dotfile with an extension", async () => {
    const server = utils.http({ dev: true });

    try {
      const res = await server.send("GET", "/.hello.txt");
      assert.equal(res.status, 404);
    } finally {
      server.close();
    }
  });

  test("should reject a dotfile in a sub-directory", async () => {
    const server = utils.http({ dev: true });

    try {
      const res = await server.send("GET", "/foo/.world");
      assert.equal(res.status, 404);
    } finally {
      server.close();
    }
  });

  test('should still serve ".well-known" contents', async () => {
    const server = utils.http({ dev: true });

    try {
      const res = await server.send("GET", "/.well-known/example");
      assert.equal(res.status, 200);
    } finally {
      server.close();
    }
  });
});

describe("symlinks", () => {
  test("should not serve a symlink that escapes the served directory :: dev", async () => {
    const link = join(www, "escape.txt");
    // Anything outside `public/` will do; package.json is guaranteed present.
    symlinkSync(join(__dirname, "..", "package.json"), link);
    const server = utils.http({ dev: true });

    try {
      const res = await server.send("GET", "/escape.txt");
      assert.equal(res.status, 404);
    } finally {
      server.close();
      unlinkSync(link);
    }
  });

  test("should not serve a symlink that escapes the served directory :: prod", async () => {
    const link = join(www, "escape.txt");
    symlinkSync(join(__dirname, "..", "package.json"), link);
    // The startup scan runs in the `sirv()` call inside `utils.http`, so the
    // link must exist before the server is created.
    const server = utils.http({ dev: false });

    try {
      const res = await server.send("GET", "/escape.txt");
      assert.equal(res.status, 404);
    } finally {
      server.close();
      unlinkSync(link);
    }
  });
});
