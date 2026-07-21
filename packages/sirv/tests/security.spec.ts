import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assert, describe, test } from "vitest";
import * as utils from "./helpers";

// The equivalent assertions in sirv.spec.ts are written as
// `send(...).catch((err) => assert.equal(err.status, 404))`; `fetch` resolves for
// any HTTP status, so that callback never runs and those tests pass whatever the
// server does. These assert on the status directly. Ported from srvx#252.

const __dirname = dirname(fileURLToPath(import.meta.url));

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

/**
 * A directory of its own, holding one regular file and one link out of it.
 *
 * The fixture cannot live in `public/`: spec files run in parallel, and creating
 * or removing an entry there races the `totalist` scan that every production-mode
 * server in the other suites performs over the same directory.
 */
function dirWithEscapingLink(): string {
  const dir = mkdtempSync(join(tmpdir(), "sirv-symlink-"));
  writeFileSync(join(dir, "inside.txt"), "inside\n");
  // Anything outside the served directory will do; package.json is always present.
  symlinkSync(join(__dirname, "..", "package.json"), join(dir, "escape.txt"));
  return dir;
}

describe.each([{ dev: true }, { dev: false }])("symlinks :: dev: $dev", (opts) => {
  test("should not serve a symlink that escapes the served directory", async () => {
    const dir = dirWithEscapingLink();
    // The production scan runs inside `sirv()`, so the link must already exist.
    const server = utils.http(opts, dir);

    try {
      const res = await server.send("GET", "/escape.txt");
      assert.equal(res.status, 404);
    } finally {
      server.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("should still serve a file that stays inside", async () => {
    const dir = dirWithEscapingLink();
    const server = utils.http(opts, dir);

    try {
      const res = await server.send("GET", "/inside.txt");
      assert.equal(res.status, 200);
      assert.equal(await res.text(), "inside\n");
    } finally {
      server.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
