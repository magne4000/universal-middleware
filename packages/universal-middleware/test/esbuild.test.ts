/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, expect, it } from "vitest";
import { build, type BuildResult } from "esbuild";
import unplugin from "../src/build";

describe("esbuild", () => {
  it("generates all server files (in/out input)", async () => {
    const entry = "test/files/folder1/handler.ts";
    const result = await build({
      entryPoints: [{ out: "handler", in: entry + "?handler" }],
      plugins: [unplugin.esbuild()],
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
      result.outputFiles.filter((f) => !f.path.includes("dist/chunk-")),
    ).toHaveLength(expectNbOutput(1));

    expect(findOutput(result, entry)).toBeTruthy();

    testEsbuildOutput(result, "handler", entry);
  });

  it("generates all server files (object input)", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/middleware.ts";
    const result = await build({
      entryPoints: {
        handler: entry1 + "?handler",
        middleware: entry2 + "?middleware",
      },
      plugins: [unplugin.esbuild()],
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
      result.outputFiles.filter((f) => !f.path.includes("dist/chunk-")),
    ).toHaveLength(expectNbOutput(2));

    expect(findOutput(result, entry1)).toBeTruthy();
    expect(findOutput(result, entry2)).toBeTruthy();

    testEsbuildOutput(result, "handler", entry1);
    testEsbuildOutput(result, "middleware", entry2);
  });

  it("generates all server files (object input)", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/middleware.ts";
    const result = await build({
      entryPoints: [entry1 + "?handler", entry2 + "?middleware"],
      plugins: [unplugin.esbuild()],
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
      result.outputFiles.filter((f) => !f.path.includes("dist/chunk-")),
    ).toHaveLength(expectNbOutput(2));

    expect(findOutput(result, entry1)).toBeTruthy();
    expect(findOutput(result, entry2)).toBeTruthy();

    testEsbuildOutput(result, "handler", entry1);
    testEsbuildOutput(result, "middleware", entry2);
  });

  it("generates all server files (multiple handlers)", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    const result = await build({
      entryPoints: [entry1 + "?handler", entry2 + "?handler"],
      plugins: [unplugin.esbuild()],
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
      result.outputFiles.filter((f) => !f.path.includes("dist/chunk-")),
    ).toHaveLength(expectNbOutput(2));

    expect(findOutput(result, entry1)).toBeTruthy();
    expect(findOutput(result, entry2)).toBeTruthy();

    testEsbuildOutput(result, "handler", entry1);
    testEsbuildOutput(result, "handler", entry2);
  });

  it("generates selected server files", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    const result = await build({
      entryPoints: [entry1 + "?handler", entry2 + "?handler"],
      plugins: [
        unplugin.esbuild({
          servers: ["hono"],
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
      result.outputFiles.filter((f) => !f.path.includes("dist/chunk-")),
    ).toHaveLength(4);

    expect(findOutput(result, entry1)).toBeTruthy();
    expect(findOutput(result, entry2)).toBeTruthy();
  });

  it("fails when bundle is not true", async () => {
    await expect(
      build({
        entryPoints: [
          "test/handler.ts?handler",
          "test/middleware.ts?middleware",
        ],
        plugins: [unplugin.esbuild()],
        outdir: "dist",
        write: false,
        metafile: true,
        platform: "neutral",
        format: "esm",
        target: "es2022",
      }),
    ).rejects.toThrow();
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
    `virtual:universal-middleware:virtual:universal-middleware:${server}:${type}:${f}?${type}`,
  );
  expect(output).toBeTruthy();

  const file = result.outputFiles.find((f) =>
    f.path.includes(`dist/universal-${server}-${type}`),
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
