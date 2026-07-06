import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import * as ed from '@noble/ed25519';

// @noble/ed25519 v2: use @noble/hashes instead of crypto.subtle
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));
ed.etc.sha512Async = (...m) => Promise.resolve(sha512(ed.etc.concatBytes(...m)));

// crypto.subtle shim for jsonld (URDNA2015 SHA-256)
const subtleShim = {
  async digest(algorithm: string | { name: string }, data: ArrayBuffer | Uint8Array): Promise<ArrayBuffer> {
    const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
    if (name !== 'SHA-256') throw new Error(`crypto.subtle shim: unsupported algorithm "${name}"`);
    const input = data instanceof Uint8Array ? data : new Uint8Array(data);
    return sha256(input).buffer as ArrayBuffer;
  },
};

if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = { subtle: subtleShim };
} else if (!globalThis.crypto.subtle) {
  (globalThis.crypto as any).subtle = subtleShim;
}
