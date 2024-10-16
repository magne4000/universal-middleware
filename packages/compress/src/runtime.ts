export const isCompressionStreamAvailable = typeof CompressionStream !== "undefined";
export const isZlibAvailable = await isNodeZlibAvailable();
export const supportedEncodings = isZlibAvailable
  ? ["br", "gzip", "deflate"]
  : isCompressionStreamAvailable
    ? ["gzip", "deflate"]
    : [];

async function isNodeZlibAvailable() {
  try {
    await import(/* @vite-ignore */ "node:zlib");
    return true;
  } catch {
    return false;
  }
}
