import mri from "mri";

export const args = mri<{ port: string }>(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (globalThis as any).Deno?.args ?? globalThis.process.argv.slice(2),
);
