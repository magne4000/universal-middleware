/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, expect, it } from "vitest";
import { type OutputChunk, rollup, type RollupOutput } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import unplugin from "../src/build";

describe("rollup", () => {
  function testRollupHandlers(gen: RollupOutput) {
    const hattip = gen.output.find(
      (f: any) =>
        f.facadeModuleId ===
        "virtual:universal-middleware:hattip:handler:test/handler.ts",
    ) as OutputChunk | undefined;
    expect(hattip?.name).toEqual("universal-hattip-handler");

    const express = gen.output.find(
      (f: any) =>
        f.facadeModuleId ===
        "virtual:universal-middleware:express:handler:test/handler.ts",
    ) as OutputChunk | undefined;
    expect(express?.name).toEqual("universal-express-handler");

    const hono = gen.output.find(
      (f: any) =>
        f.facadeModuleId ===
        "virtual:universal-middleware:hono:handler:test/handler.ts",
    ) as OutputChunk | undefined;
    expect(hono?.name).toEqual("universal-hono-handler");
  }

  function testRollupMiddlewares(gen: RollupOutput) {
    const hattip = gen.output.find(
      (f: any) =>
        f.facadeModuleId ===
        "virtual:universal-middleware:hattip:middleware:test/middleware.ts",
    ) as OutputChunk | undefined;
    expect(hattip?.name).toEqual("universal-hattip-middleware");

    const express = gen.output.find(
      (f: any) =>
        f.facadeModuleId ===
        "virtual:universal-middleware:express:middleware:test/middleware.ts",
    ) as OutputChunk | undefined;
    expect(express?.name).toEqual("universal-express-middleware");

    const hono = gen.output.find(
      (f: any) =>
        f.facadeModuleId ===
        "virtual:universal-middleware:hono:middleware:test/middleware.ts",
    ) as OutputChunk | undefined;
    expect(hono?.name).toEqual("universal-hono-middleware");
  }

  it("generates all server files (string input)", async () => {
    const result = await rollup({
      input: "test/handler.ts?handler",
      plugins: [unplugin.rollup(), nodeResolve()],
      onwarn(warning) {
        throw new Error(warning.message);
      },
    });

    const gen = await result.generate({});

    const handler = gen.output.find(
      (f: any) => f.facadeModuleId === "test/handler.ts",
    ) as OutputChunk | undefined;
    expect(handler?.name).toEqual("handler");

    testRollupHandlers(gen);
  });

  it("generates all server files (object input)", async () => {
    const result = await rollup({
      input: {
        h: "test/handler.ts?handler",
        m: "test/middleware.ts?middleware",
      },
      plugins: [unplugin.rollup(), nodeResolve()],
      onwarn(warning) {
        throw new Error(warning.message);
      },
    });

    const gen = await result.generate({});

    const handler = gen.output.find(
      (f: any) => f.facadeModuleId === "test/handler.ts",
    ) as OutputChunk | undefined;
    expect(handler?.name).toEqual("h");

    const middleware = gen.output.find(
      (f: any) => f.facadeModuleId === "test/middleware.ts",
    ) as OutputChunk | undefined;
    expect(middleware?.name).toEqual("m");

    testRollupHandlers(gen);
    testRollupMiddlewares(gen);
  });

  it("generates all server files (array input)", async () => {
    const result = await rollup({
      input: ["test/handler.ts?handler", "test/middleware.ts?middleware"],
      plugins: [unplugin.rollup(), nodeResolve()],
      onwarn(warning) {
        throw new Error(warning.message);
      },
    });

    const gen = await result.generate({});

    const handler = gen.output.find(
      (f: any) => f.facadeModuleId === "test/handler.ts",
    ) as OutputChunk | undefined;
    expect(handler?.name).toEqual("handler");

    const middleware = gen.output.find(
      (f: any) => f.facadeModuleId === "test/middleware.ts",
    ) as OutputChunk | undefined;
    expect(middleware?.name).toEqual("middleware");

    testRollupHandlers(gen);
    testRollupMiddlewares(gen);
  });
});
