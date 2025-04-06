# Compression Tests

This directory contains tests for the compression functionality in the `@universal-middleware/compress` package.

## Test Files

### compression.spec.ts
Tests the basic compression functionality using `handleCompression` with different encodings (gzip, deflate, brotli).

### encoding.spec.ts
Tests the `EncodingGuesser` functionality that determines which compression algorithm to use based on request headers.

### flush.spec.ts
Tests the flush behavior of compression streams to ensure data is properly flushed during streaming. This is critical for progressive streaming applications like React Server Components.

### streaming.spec.ts
Tests streaming compression with both zlib and fflate implementations, verifying that chunks are properly flushed during streaming.

### whatwg-vs-fflate.spec.ts
Demonstrates the difference between the WHATWG Compression API (which doesn't flush properly during streaming) and the fflate implementation (which does).

## Key Improvements Tested

1. **Proper Streaming Compression**: Tests verify that compressed data is flushed incrementally during streaming, rather than only at the end of the stream.

2. **Zlib Preference**: Tests verify that zlib is preferred when available, as it provides better control over flushing.

3. **Fallback to fflate**: Tests verify that fflate provides proper streaming compression when zlib is unavailable.

4. **Flush Flags**: Tests verify that explicit flush flags (Z_SYNC_FLUSH for gzip/deflate and BROTLI_OPERATION_FLUSH for brotli) ensure compressed data is flushed at appropriate synchronization points.

## Running Tests

```bash
pnpm test
```

## Notes

- All tests are designed to run in a proper Node.js environment with the necessary APIs available.
- Tests focus on stable assertions like chunk counts and compression ratios, avoiding timing-based assertions that could be unstable across different environments.
- Tests verify that the number of output chunks is at least equal to the number of input chunks, ensuring proper flush behavior.
