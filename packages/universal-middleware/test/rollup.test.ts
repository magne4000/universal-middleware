import { join, parse } from "node:path";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { type OutputChunk, type RollupOutput, rollup } from "rollup";
import { describe, expect, it } from "vitest";
import plugin from "../src/rollup";
import { adapters, expectNbOutput, options } from "./common";

describe("rollup", () => {
  it("generates all server files (string input)", options, async () => {
    const entry = "test/files/folder1/handler.ts";
    const result = await rollup({
      input: entry,
      plugins: [
        plugin({
          doNotEditPackageJson: true,
          dts: false,
          buildEnd(report) {
            expect(report).toHaveLength(expectNbOutput(1));
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./test/files/folder1/handler-handler");

            for (const adapter of adapters) {
              expect(exports).toContain(`./test/files/folder1/handler-handler-${adapter}`);
            }
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

    expect(gen.output.filter((f) => f.type === "chunk" && f.isEntry)).toHaveLength(expectNbOutput(1));

    const handler = gen.output.find((f: any) => f.facadeModuleId === entry) as OutputChunk | undefined;
    expect(handler?.name).toEqual(join("test", "files", "folder1", "handler"));

    testRollupOutput(gen, "handler", entry);
  });

  it("generates all server files (object input)", options, async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/middleware.ts";
    const result = await rollup({
      input: {
        h: entry1,
        m: entry2,
      },
      plugins: [
        plugin({
          doNotEditPackageJson: true,
          dts: false,
          buildEnd(report) {
            expect(report).toHaveLength(expectNbOutput(2));
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./h-handler");
            expect(exports).toContain("./m-middleware");
            for (const adapter of adapters) {
              expect(exports).toContain(`./h-handler-${adapter}`);
              expect(exports).toContain(`./m-middleware-${adapter}`);
            }
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

    expect(gen.output.filter((f) => f.type === "chunk" && f.isEntry)).toHaveLength(expectNbOutput(2));

    const handler = gen.output.find((f: any) => f.facadeModuleId === entry1) as OutputChunk | undefined;
    expect(handler?.name).toEqual("h");

    const middleware = gen.output.find((f: any) => f.facadeModuleId === entry2) as OutputChunk | undefined;
    expect(middleware?.name).toEqual("m");

    testRollupOutput(gen, "handler", entry1);
    testRollupOutput(gen, "middleware", entry2);
  });

  it("generates all server files (array input)", options, async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/middleware.ts";
    const result = await rollup({
      input: [entry1, entry2],
      plugins: [
        plugin({
          doNotEditPackageJson: true,
          dts: false,
          buildEnd(report) {
            expect(report).toHaveLength(expectNbOutput(2));
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./test/files/folder1/handler-handler");
            expect(exports).toContain("./test/files/middleware-middleware");
            for (const adapter of adapters) {
              expect(exports).toContain(`./test/files/folder1/handler-handler-${adapter}`);
              expect(exports).toContain(`./test/files/middleware-middleware-${adapter}`);
            }
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

    expect(gen.output.filter((f) => f.type === "chunk" && f.isEntry)).toHaveLength(expectNbOutput(2));

    const handler = gen.output.find((f: any) => f.facadeModuleId === entry1) as OutputChunk | undefined;
    expect(handler?.name).toEqual(join("test", "files", "folder1", "handler"));

    const middleware = gen.output.find((f: any) => f.facadeModuleId === entry2) as OutputChunk | undefined;
    expect(middleware?.name).toEqual(join("test", "files", "middleware"));

    testRollupOutput(gen, "handler", entry1);
    testRollupOutput(gen, "middleware", entry2);
  });

  it("generates all server files (multiple handlers)", options, async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    const result = await rollup({
      input: [entry1, entry2],
      plugins: [
        plugin({
          doNotEditPackageJson: true,
          dts: false,
          buildEnd(report) {
            expect(report).toHaveLength(expectNbOutput(2));
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./test/files/folder1/handler-handler");
            expect(exports).toContain("./test/files/folder2/handler-handler");
            for (const adapter of adapters) {
              expect(exports).toContain(`./test/files/folder1/handler-handler-${adapter}`);
              expect(exports).toContain(`./test/files/folder2/handler-handler-${adapter}`);
            }
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

    expect(gen.output.filter((f) => f.type === "chunk" && f.isEntry)).toHaveLength(expectNbOutput(2));

    const handler1 = gen.output.find((f: any) => f.facadeModuleId === entry1) as OutputChunk | undefined;
    expect(handler1?.name).toEqual(join("test", "files", "folder1", "handler"));

    const handler2 = gen.output.find((f: any) => f.facadeModuleId === entry2) as OutputChunk | undefined;
    expect(handler2?.name).toEqual(join("test", "files", "folder2", "handler"));

    testRollupOutput(gen, "handler", entry1);
    testRollupOutput(gen, "handler", entry2);
  });

  it("generates selected server files", options, async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    const result = await rollup({
      input: [entry1, entry2],
      plugins: [
        plugin({
          doNotEditPackageJson: true,
          dts: false,
          servers: ["hono"],
          buildEnd(report) {
            expect(report).toHaveLength(4);
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./test/files/folder1/handler-handler");
            expect(exports).toContain("./test/files/folder2/handler-handler");
            expect(exports).toContain("./test/files/folder1/handler-handler-hono");
            expect(exports).toContain("./test/files/folder2/handler-handler-hono");
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

    expect(gen.output.filter((f) => f.type === "chunk" && f.isEntry)).toHaveLength(4);

    const handler1 = gen.output.find((f: any) => f.facadeModuleId === entry1) as OutputChunk | undefined;
    expect(handler1?.name).toEqual(join("test", "files", "folder1", "handler"));

    const handler2 = gen.output.find((f: any) => f.facadeModuleId === entry2) as OutputChunk | undefined;
    expect(handler2?.name).toEqual(join("test", "files", "folder2", "handler"));
  });

  it("fails when exports overlap", options, async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";

    const result = await rollup({
      input: [entry1, entry2],
      plugins: [
        plugin({
          doNotEditPackageJson: true,
          dts: false,
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

    await expect(result.generate({})).rejects.toThrow("The following files have overlapping exports");
  });
});

function testRollupHandler(gen: RollupOutput, type: "handler" | "middleware", server: string, f: string) {
  const parsed = parse(f);
  const res = gen.output.find(
    (file: any) => file.facadeModuleId === `virtual:universal-middleware:${server}:${type}:${f}`,
  ) as OutputChunk | undefined;
  expect(res?.name.replaceAll("\\", "/")).toEqual(`${parsed.dir}/universal-${server}-${type}-${parsed.name}`);
}

function testRollupOutput(gen: RollupOutput, type: "handler" | "middleware", f: string) {
  for (const adapter of adapters) {
    if (adapter === "cloudflare-pages" || adapter === "cloudflare-worker") {
      continue;
    }
    testRollupHandler(gen, type, adapter, f);
  }
}
