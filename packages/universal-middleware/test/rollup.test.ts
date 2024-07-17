/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, expect, it } from "vitest";
import { type OutputChunk, rollup, type RollupOutput } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import unplugin from "../src/build";
import { join, parse } from "node:path";

describe("rollup", () => {
  it("generates all server files (string input)", async () => {
    const entry = "test/files/folder1/handler.ts";
    const result = await rollup({
      input: entry + "?handler",
      plugins: [
        unplugin.rollup({
          buildEnd(report) {
            expect(report).toHaveLength(expectNbOutput(1));
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./test/files/folder1/handler-handler");
            expect(exports).toContain(
              "./test/files/folder1/handler-handler-hono",
            );
            expect(exports).toContain(
              "./test/files/folder1/handler-handler-express",
            );
            expect(exports).toContain(
              "./test/files/folder1/handler-handler-hattip",
            );
          },
        }),
        nodeResolve(),
        typescript({
          sourceMap: false,
        }),
      ],
      onwarn(warning) {
        throw new Error(warning.message);
      },
    });

    const gen = await result.generate({});

    expect(
      gen.output.filter((f) => f.type === "chunk" && f.isEntry),
    ).toHaveLength(expectNbOutput(1));

    const handler = gen.output.find((f: any) => f.facadeModuleId === entry) as
      | OutputChunk
      | undefined;
    expect(handler?.name).toEqual(join("test", "files", "folder1", "handler"));

    testRollupOutput(gen, "handler", entry);
  });

  it("generates all server files (object input)", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/middleware.ts";
    const result = await rollup({
      input: {
        h: entry1 + "?handler",
        m: entry2 + "?middleware",
      },
      plugins: [
        unplugin.rollup({
          buildEnd(report) {
            expect(report).toHaveLength(expectNbOutput(2));
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./h-handler");
            expect(exports).toContain("./m-middleware");
            expect(exports).toContain("./h-handler-hono");
            expect(exports).toContain("./h-handler-express");
            expect(exports).toContain("./h-handler-hattip");
            expect(exports).toContain("./m-middleware-hono");
            expect(exports).toContain("./m-middleware-express");
            expect(exports).toContain("./m-middleware-hattip");
          },
        }),
        nodeResolve(),
        typescript({
          sourceMap: false,
        }),
      ],
      onwarn(warning) {
        throw new Error(warning.message);
      },
    });

    const gen = await result.generate({});

    expect(
      gen.output.filter((f) => f.type === "chunk" && f.isEntry),
    ).toHaveLength(expectNbOutput(2));

    const handler = gen.output.find((f: any) => f.facadeModuleId === entry1) as
      | OutputChunk
      | undefined;
    expect(handler?.name).toEqual("h");

    const middleware = gen.output.find(
      (f: any) => f.facadeModuleId === entry2,
    ) as OutputChunk | undefined;
    expect(middleware?.name).toEqual("m");

    testRollupOutput(gen, "handler", entry1);
    testRollupOutput(gen, "middleware", entry2);
  });

  it("generates all server files (array input)", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/middleware.ts";
    const result = await rollup({
      input: [entry1 + "?handler", entry2 + "?middleware"],
      plugins: [
        unplugin.rollup({
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
        nodeResolve(),
        typescript({
          sourceMap: false,
        }),
      ],
      onwarn(warning) {
        throw new Error(warning.message);
      },
    });

    const gen = await result.generate({});

    expect(
      gen.output.filter((f) => f.type === "chunk" && f.isEntry),
    ).toHaveLength(expectNbOutput(2));

    const handler = gen.output.find((f: any) => f.facadeModuleId === entry1) as
      | OutputChunk
      | undefined;
    expect(handler?.name).toEqual(join("test", "files", "folder1", "handler"));

    const middleware = gen.output.find(
      (f: any) => f.facadeModuleId === entry2,
    ) as OutputChunk | undefined;
    expect(middleware?.name).toEqual(join("test", "files", "middleware"));

    testRollupOutput(gen, "handler", entry1);
    testRollupOutput(gen, "middleware", entry2);
  });

  it("generates all server files (multiple handlers)", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    const result = await rollup({
      input: [entry1 + "?handler", entry2 + "?handler"],
      plugins: [
        unplugin.rollup({
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
        nodeResolve(),
        typescript({
          sourceMap: false,
        }),
      ],
      onwarn(warning) {
        throw new Error(warning.message);
      },
    });

    const gen = await result.generate({});

    expect(
      gen.output.filter((f) => f.type === "chunk" && f.isEntry),
    ).toHaveLength(expectNbOutput(2));

    const handler1 = gen.output.find(
      (f: any) => f.facadeModuleId === entry1,
    ) as OutputChunk | undefined;
    expect(handler1?.name).toEqual(join("test", "files", "folder1", "handler"));

    const handler2 = gen.output.find(
      (f: any) => f.facadeModuleId === entry2,
    ) as OutputChunk | undefined;
    expect(handler2?.name).toEqual(join("test", "files", "folder2", "handler"));

    testRollupOutput(gen, "handler", entry1);
    testRollupOutput(gen, "handler", entry2);
  });

  it("generates selected server files", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    const result = await rollup({
      input: [entry1 + "?handler", entry2 + "?handler"],
      plugins: [
        unplugin.rollup({
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
        nodeResolve(),
        typescript({
          sourceMap: false,
        }),
      ],
      onwarn(warning) {
        throw new Error(warning.message);
      },
    });

    const gen = await result.generate({});

    expect(
      gen.output.filter((f) => f.type === "chunk" && f.isEntry),
    ).toHaveLength(4);

    const handler1 = gen.output.find(
      (f: any) => f.facadeModuleId === entry1,
    ) as OutputChunk | undefined;
    expect(handler1?.name).toEqual(join("test", "files", "folder1", "handler"));

    const handler2 = gen.output.find(
      (f: any) => f.facadeModuleId === entry2,
    ) as OutputChunk | undefined;
    expect(handler2?.name).toEqual(join("test", "files", "folder2", "handler"));
  });

  it("fails when exports overlap", async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";

    const result = await rollup({
      input: [entry1 + "?handler", entry2 + "?handler"],
      plugins: [
        unplugin.rollup({
          serversExportNames: "[name]-[type]-[server]",
        }),
        nodeResolve(),
        typescript({
          sourceMap: false,
        }),
      ],
      onwarn(warning) {
        throw new Error(warning.message);
      },
    });

    await expect(result.generate({})).rejects.toThrow(
      "The following files have overlapping exports",
    );
  });
});

function testRollupHandler(
  gen: RollupOutput,
  type: "handler" | "middleware",
  server: string,
  f: string,
) {
  const parsed = parse(f);
  const res = gen.output.find(
    (file: any) =>
      file.facadeModuleId ===
      `virtual:universal-middleware:${server}:${type}:${f}`,
  ) as OutputChunk | undefined;
  expect(res!.name.replaceAll("\\", "/")).toEqual(
    `${parsed.dir}/universal-${server}-${type}-${parsed.name}`,
  );
}

function testRollupOutput(
  gen: RollupOutput,
  type: "handler" | "middleware",
  f: string,
) {
  testRollupHandler(gen, type, "express", f);
  testRollupHandler(gen, type, "hono", f);
  testRollupHandler(gen, type, "hattip", f);
}

function expectNbOutput(i: number) {
  return i * 4;
}
