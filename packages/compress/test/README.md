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

## Features Tested

1. **Streaming Compression**: Validates that compressed data is flushed incrementally during streaming, rather than only at the end of the stream.

2. **Cross-Environment Compatibility**: Ensures compression works correctly in both Node.js (using zlib) and browser/edge environments (using fflate).

3. **Compression Algorithms**: Confirms support for multiple compression algorithms (gzip, deflate, deflate-raw, brotli) with proper headers and content encoding.

4. **Compression Efficiency**: Demonstrates that both implementations provide similar compression ratios while maintaining streaming capabilities.

## Running Tests

```bash
pnpm test
```

## Implementation Details

- **Node.js Environment**: Uses Node.js zlib module with appropriate flush flags (Z_SYNC_FLUSH for gzip/deflate and BROTLI_OPERATION_FLUSH for brotli).

- **Browser/Edge Environment**: Uses fflate library configured to flush data after each chunk.

- **Automatic Detection**: The package automatically selects the appropriate implementation based on the runtime environment.

## Test Design Notes

- **Environment Compatibility**: Primarily designed to run in a Node.js environment, as some tests specifically target Node.js zlib functionality.
- **Stability Focus**: Emphasizes stable assertions like chunk counts and compression ratios, avoiding timing-based assertions that could be unstable across different environments.
- **Flush Behavior Verification**: Ensures that the number of output chunks is at least equal to the number of input chunks, confirming proper flush behavior for streaming applications.
