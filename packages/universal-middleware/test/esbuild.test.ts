/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, expect, it } from "vitest";
import { build, type BuildResult } from "esbuild";
import plugin from "../src/esbuild";
import { join } from "node:path";

describe("esbuild", () => {
  it("generates all server files (in/out input)", async () => {
    const entry = "test/files/folder1/handler.ts";
    const result = await build({
      entryPoints: [{ out: "handler", in: entry }],
      plugins: [
        plugin({
          buildEnd(report) {
            console.log(report);
            expect(report).toHaveLength(expectNbOutput(1));
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./handler-handler");
            expect(exports).toContain("./handler-handler-hono");
            expect(exports).toContain("./handler-handler-express");
            expect(exports).toContain("./handler-handler-hattip");
          },
        }),
      ],
      outdir: "dist",
      write: false,
      metafile: true,
      bundle: true,
      platform: "neutral",
      format: "esm",
      target: "es2022",
      splitting: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(
      result.outputFiles.filter(
        (f) => !f.path.includes(join("dist", "chunk-")),
      ),
    ).toHaveLength(expectNbOutput(1));

    expect(findOutput(result, entry)).toSatisfy((s: string) =>
      s.startsWith("dist/handler"),
    );

    testEsbuildOutput(result, "handler", entry);
  });

  it("generates all server files (object input)", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/middleware.ts";
    const result = await build({
      entryPoints: {
        "handlers/one": entry1,
        middleware: entry2,
      },
      plugins: [
        plugin({
          buildEnd(report) {
            expect(report).toHaveLength(expectNbOutput(2));
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./handlers/one-handler");
            expect(exports).toContain("./middleware-middleware");
            expect(exports).toContain("./handlers/one-handler-hono");
            expect(exports).toContain("./handlers/one-handler-express");
            expect(exports).toContain("./handlers/one-handler-hattip");
            expect(exports).toContain("./middleware-middleware-hono");
            expect(exports).toContain("./middleware-middleware-express");
            expect(exports).toContain("./middleware-middleware-hattip");
          },
        }),
      ],
      outdir: "dist",
      write: false,
      metafile: true,
      bundle: true,
      platform: "neutral",
      format: "esm",
      target: "es2022",
      splitting: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(
      result.outputFiles.filter(
        (f) => !f.path.includes(join("dist", "chunk-")),
      ),
    ).toHaveLength(expectNbOutput(2));

    expect(findOutput(result, entry1)).toSatisfy((s: string) =>
      s.startsWith("dist/handlers/one"),
    );
    expect(findOutput(result, entry2)).toSatisfy((s: string) =>
      s.startsWith("dist/middleware"),
    );

    testEsbuildOutput(result, "handler", entry1);
    testEsbuildOutput(result, "middleware", entry2);
  });

  it("generates all server files (array input)", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/middleware.ts";
    const result = await build({
      entryPoints: [entry1, entry2],
      plugins: [
        plugin({
          buildEnd(report) {
            expect(report).toHaveLength(expectNbOutput(2));
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./test/files/folder1/handler-handler");
            expect(exports).toContain("./test/files/middleware-middleware");
            expect(exports).toContain(
              "./test/files/folder1/handler-handler-hono",
            );
            expect(exports).toContain(
              "./test/files/folder1/handler-handler-express",
            );
            expect(exports).toContain(
              "./test/files/folder1/handler-handler-hattip",
            );
            expect(exports).toContain(
              "./test/files/middleware-middleware-hono",
            );
            expect(exports).toContain(
              "./test/files/middleware-middleware-express",
            );
            expect(exports).toContain(
              "./test/files/middleware-middleware-hattip",
            );
          },
        }),
      ],
      outdir: "dist",
      write: false,
      metafile: true,
      bundle: true,
      platform: "neutral",
      format: "esm",
      target: "es2022",
      splitting: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(
      result.outputFiles.filter(
        (f) => !f.path.includes(join("dist", "chunk-")),
      ),
    ).toHaveLength(expectNbOutput(2));

    expect(findOutput(result, entry1)).toSatisfy((s: string) =>
      s.startsWith("dist/test/files/folder1/handler"),
    );
    expect(findOutput(result, entry2)).toSatisfy((s: string) =>
      s.startsWith("dist/test/files/middleware"),
    );

    testEsbuildOutput(result, "handler", entry1);
    testEsbuildOutput(result, "middleware", entry2);
  });

  it("generates all server files (multiple handlers)", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    const result = await build({
      entryPoints: [entry1, entry2],
      plugins: [
        plugin({
          buildEnd(report) {
            expect(report).toHaveLength(expectNbOutput(2));
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./test/files/folder1/handler-handler");
            expect(exports).toContain("./test/files/folder2/handler-handler");
            expect(exports).toContain(
              "./test/files/folder1/handler-handler-hono",
            );
            expect(exports).toContain(
              "./test/files/folder1/handler-handler-express",
            );
            expect(exports).toContain(
              "./test/files/folder1/handler-handler-hattip",
            );
            expect(exports).toContain(
              "./test/files/folder2/handler-handler-hono",
            );
            expect(exports).toContain(
              "./test/files/folder2/handler-handler-express",
            );
            expect(exports).toContain(
              "./test/files/folder2/handler-handler-hattip",
            );
          },
        }),
      ],
      outdir: "dist",
      write: false,
      metafile: true,
      bundle: true,
      platform: "neutral",
      format: "esm",
      target: "es2022",
      splitting: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(
      result.outputFiles.filter(
        (f) => !f.path.includes(join("dist", "chunk-")),
      ),
    ).toHaveLength(expectNbOutput(2));

    expect(findOutput(result, entry1)).toSatisfy((s: string) =>
      s.startsWith("dist/test/files/folder1/handler"),
    );
    expect(findOutput(result, entry2)).toSatisfy((s: string) =>
      s.startsWith("dist/test/files/folder2/handler"),
    );

    testEsbuildOutput(result, "handler", entry1);
    testEsbuildOutput(result, "handler", entry2);
  });

  it("respects outbase", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    const result = await build({
      entryPoints: [entry1, entry2],
      plugins: [
        plugin({
          buildEnd(report) {
            expect(report).toHaveLength(expectNbOutput(2));
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./folder1/handler-handler");
            expect(exports).toContain("./folder2/handler-handler");
            expect(exports).toContain("./folder1/handler-handler-hono");
            expect(exports).toContain("./folder1/handler-handler-express");
            expect(exports).toContain("./folder1/handler-handler-hattip");
            expect(exports).toContain("./folder2/handler-handler-hono");
            expect(exports).toContain("./folder2/handler-handler-express");
            expect(exports).toContain("./folder2/handler-handler-hattip");
          },
        }),
      ],
      outdir: "dist",
      outbase: "test/files",
      write: false,
      metafile: true,
      bundle: true,
      platform: "neutral",
      format: "esm",
      target: "es2022",
      splitting: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(
      result.outputFiles.filter(
        (f) => !f.path.includes(join("dist", "chunk-")),
      ),
    ).toHaveLength(expectNbOutput(2));

    expect(findOutput(result, entry1)).toSatisfy((s: string) =>
      s.startsWith("dist/folder1/handler"),
    );
    expect(findOutput(result, entry2)).toSatisfy((s: string) =>
      s.startsWith("dist/folder2/handler"),
    );

    testEsbuildOutput(result, "handler", entry1);
    testEsbuildOutput(result, "handler", entry2);
  });

  it("generates selected server files", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    const result = await build({
      entryPoints: [entry1, entry2],
      plugins: [
        plugin({
          servers: ["hono"],
          buildEnd(report) {
            expect(report).toHaveLength(4);
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./test/files/folder1/handler-handler");
            expect(exports).toContain("./test/files/folder2/handler-handler");
            expect(exports).toContain(
              "./test/files/folder1/handler-handler-hono",
            );
            expect(exports).toContain(
              "./test/files/folder2/handler-handler-hono",
            );
          },
        }),
      ],
      outdir: "dist",
      write: false,
      metafile: true,
      bundle: true,
      platform: "neutral",
      format: "esm",
      target: "es2022",
      splitting: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(
      result.outputFiles.filter(
        (f) => !f.path.includes(join("dist", "chunk-")),
      ),
    ).toHaveLength(4);

    expect(findOutput(result, entry1)).toSatisfy((s: string) =>
      s.startsWith("dist/test/files/folder1/handler"),
    );
    expect(findOutput(result, entry2)).toSatisfy((s: string) =>
      s.startsWith("dist/test/files/folder2/handler"),
    );
  });

  it("fails when bundle is not true", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    await expect(
      build({
        entryPoints: [entry1, entry2],
        plugins: [plugin()],
        outdir: "dist",
        write: false,
        metafile: true,
        platform: "neutral",
        format: "esm",
        target: "es2022",
      }),
    ).rejects.toThrow("bundle");
  });

  it("fails when exports overlap", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    await expect(
      build({
        entryPoints: [entry1, entry2],
        plugins: [
          plugin({
            serversExportNames: "[name]-[type]-[server]",
          }),
        ],
        outdir: "dist",
        bundle: true,
        write: false,
        metafile: true,
        platform: "neutral",
        format: "esm",
        target: "es2022",
      }),
    ).rejects.toThrow("The following files have overlapping exports");
  });
});

function findOutput(
  result: BuildResult<{ metafile: true; write: false }>,
  entry: string,
) {
  return Object.entries(result.metafile.outputs).find(
    ([, value]) => value.entryPoint === entry,
  )?.[0];
}

function testEsbuildHandler(
  result: BuildResult<{ metafile: true; write: false }>,
  type: "handler" | "middleware",
  server: string,
  f: string,
) {
  const output = findOutput(
    result,
    `virtual:universal-middleware:virtual:universal-middleware:${server}:${type}:${f}`,
  );
  expect(output).toBeTruthy();

  const file = result.outputFiles.find((f) =>
    f.path.includes(`universal-${server}-${type}`),
  );
  if (type === "handler") {
    expect(file?.text).toContain(
      `import { createHandler } from "@universal-middleware/${server}"`,
    );
  } else {
    expect(file?.text).toContain(
      `import { createMiddleware } from "@universal-middleware/${server}"`,
    );
  }
}

function testEsbuildOutput(
  result: BuildResult<{ metafile: true; write: false }>,
  type: "handler" | "middleware",
  file: string,
) {
  testEsbuildHandler(result, type, "express", file);
  testEsbuildHandler(result, type, "hono", file);
  testEsbuildHandler(result, type, "hattip", file);
}

function expectNbOutput(i: number) {
  return i * 4;
}
