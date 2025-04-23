import * as lz4 from 'lz4-wasm';

// needa version of this that runs in both places!
export function compressWithLz4Client(uint8Array: Uint8Array): Uint8Array {
  if (typeof window === 'undefined') {
    throw new Error('compressWithLz4 can only be used in browser environments');
  }
  const compressed = lz4.compress(uint8Array);
  return compressed;
}

export function decompressWithLz4Client(uint8Array: Uint8Array): Uint8Array {
  if (typeof window === 'undefined') {
    throw new Error('decompressWithLz4 can only be used in browser environments');
  }
  const decompressed = lz4.decompress(uint8Array);
  return decompressed;
}
