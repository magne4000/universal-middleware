export async function decompressResponse(res: Response, format: CompressionFormat): Promise<string> {
  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  const decompressedStream = res.body!.pipeThrough(new DecompressionStream(format));
  const decompressedResponse = new Response(decompressedStream);
  return await decompressedResponse.text();
}
