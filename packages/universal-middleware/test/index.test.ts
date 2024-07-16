/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, expect, it } from "vitest";
import { type OutputChunk, rollup } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import unplugin from "../src/build";

describe("rollup", () => {
  it("generates all server files", async () => {
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
  });
});
