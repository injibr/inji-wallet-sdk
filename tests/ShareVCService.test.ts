jest.mock('react-native', () => ({
  NativeModules: {},
  Platform: { OS: 'web' },
}));

jest.mock('@noble/ed25519', () => ({
  etc: { concatBytes: (...values: Uint8Array[]) => new Uint8Array(values.flatMap((value) => Array.from(value))) },
  signAsync: jest.fn().mockResolvedValue(new Uint8Array(64)),
}));

import { Buffer } from 'buffer';
import { ShareVCService } from '../src/services/ShareVCService';

const publicJwk = { kty: 'OKP', crv: 'Ed25519', x: Buffer.alloc(32, 7).toString('base64url') };
const parseDid = (did: string) => JSON.parse(Buffer.from(did.slice('did:jwk:'.length).split('#')[0], 'base64url').toString('utf8'));

describe('ShareVCService holder DID', () => {
  it('encodes the persisted Ed25519 public key as an unpadded did:jwk', () => {
    const service = new ShareVCService({} as any);
    (service as any).publicKey = Buffer.alloc(32, 7);

    const did = (service as any).buildHolderDID() as string;

    expect(did).toMatch(/^did:jwk:[A-Za-z0-9_-]+$/);
    expect(parseDid(did)).toEqual(publicJwk);
  });

  it('uses the holder key with fragment #0 as VP verification method', async () => {
    const service = new ShareVCService({} as any);
    const holderKey = Buffer.alloc(32, 7);
    (service as any).publicKey = holderKey;
    (service as any).privateKey = Buffer.alloc(32, 8);
    (service as any).canonicalizeForSigning = jest.fn().mockResolvedValue(Buffer.alloc(64));
    const subjectDid = 'did:jwk:' + Buffer.from(JSON.stringify(publicJwk)).toString('base64');
    const credential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'ECACredential'],
      proof: { type: 'Ed25519Signature2020' },
      credentialSubject: { id: subjectDid },
    };
    const authRequest = { nonce: 'nonce', client_id: 'http://localhost:30091' } as any;
    const vp = await (service as any).buildLdpVP([{ inputDescriptorId: 'eca', vc: { metadata: { originalCredential: credential } } }], authRequest);

    expect(vp.proof.verificationMethod).toBe(vp.holder + '#0');
    expect(vp.holder).not.toContain('=');
    expect(parseDid(vp.holder)).toEqual(parseDid(subjectDid));
  });
});
