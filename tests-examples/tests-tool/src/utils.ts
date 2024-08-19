import mri from "mri";

export const args = mri<{ port: string }>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Deno?.args ?? globalThis.process.argv.slice(2),
);
