/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, expect, it } from "vitest";
import { build, type BuildResult } from "esbuild";
import plugin from "../src/esbuild";
import { join } from "node:path";
import { adapters, options } from "./common";

describe("esbuild", () => {
  it("generates all server files (in/out input)", options, async () => {
    const entry = "test/files/folder1/handler.ts";
    const result = await build({
      entryPoints: [{ out: "handler", in: entry }],
      plugins: [
        plugin({
          doNotEditPackageJson: true,
          dts: false,
          buildEnd(report) {
            expect(report).toHaveLength(expectNbOutput(1));
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./handler-handler");

            for (const adapter of adapters) {
              expect(exports).toContain(`./handler-handler-${adapter}`);
            }
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

  it("generates all server files (object input)", options, async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/middleware.ts";
    const result = await build({
      entryPoints: {
        "handlers/one": entry1,
        middleware: entry2,
      },
      plugins: [
        plugin({
          doNotEditPackageJson: true,
          dts: false,
          buildEnd(report) {
            expect(report).toHaveLength(expectNbOutput(2));
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./handlers/one-handler");
            expect(exports).toContain("./middleware-middleware");
            for (const adapter of adapters) {
              expect(exports).toContain(`./handlers/one-handler-${adapter}`);
              expect(exports).toContain(`./middleware-middleware-${adapter}`);
            }
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

  it("generates all server files (array input)", options, async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/middleware.ts";
    const result = await build({
      entryPoints: [entry1, entry2],
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
              expect(exports).toContain(
                `./test/files/folder1/handler-handler-${adapter}`,
              );
              expect(exports).toContain(
                `./test/files/middleware-middleware-${adapter}`,
              );
            }
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

  it("generates all server files (multiple handlers)", options, async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    const result = await build({
      entryPoints: [entry1, entry2],
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
              expect(exports).toContain(
                `./test/files/folder1/handler-handler-${adapter}`,
              );
              expect(exports).toContain(
                `./test/files/folder2/handler-handler-${adapter}`,
              );
            }
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

  it("respects outbase", options, async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    const result = await build({
      entryPoints: [entry1, entry2],
      plugins: [
        plugin({
          doNotEditPackageJson: true,
          dts: false,
          buildEnd(report) {
            expect(report).toHaveLength(expectNbOutput(2));
            const exports = report.map((r) => r.exports);

            expect(exports).toContain("./folder1/handler-handler");
            expect(exports).toContain("./folder2/handler-handler");

            for (const adapter of adapters) {
              expect(exports).toContain(`./folder1/handler-handler-${adapter}`);
              expect(exports).toContain(`./folder2/handler-handler-${adapter}`);
            }
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

  it("generates selected server files", options, async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    const result = await build({
      entryPoints: [entry1, entry2],
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

  it("fails when bundle is not true", options, async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    await expect(
      build({
        entryPoints: [entry1, entry2],
        plugins: [
          plugin({
            doNotEditPackageJson: true,
            dts: false,
          }),
        ],
        outdir: "dist",
        write: false,
        metafile: true,
        platform: "neutral",
        format: "esm",
        target: "es2022",
      }),
    ).rejects.toThrow("bundle");
  });

  it("fails when exports overlap", options, async () => {
    const entry1 = "test/files/folder1/handler.ts";
    const entry2 = "test/files/folder2/handler.ts";
    await expect(
      build({
        entryPoints: [entry1, entry2],
        plugins: [
          plugin({
            doNotEditPackageJson: true,
            dts: false,
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
  for (const adapter of adapters) {
    testEsbuildHandler(result, type, adapter, file);
  }
}

function expectNbOutput(i: number) {
  return i * (adapters.length + 1);
}
