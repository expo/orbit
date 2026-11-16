// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// Thin wrappers over node:crypto for the primitives RemotePairing needs.
import crypto from 'crypto';

const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const X25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b656e04220420', 'hex');
const X25519_SPKI_PREFIX = Buffer.from('302a300506032b656e032100', 'hex');

export function randomBytes(size: number): Buffer {
  return crypto.randomBytes(size);
}

export function sha512(...parts: (Buffer | Uint8Array | string)[]): Buffer {
  const hash = crypto.createHash('sha512');
  for (const part of parts) hash.update(part);
  return hash.digest();
}

/** HKDF-SHA512. A null salt means a zero-filled salt of the hash length (RFC 5869). */
export function hkdf512(
  ikm: Buffer | Uint8Array,
  salt: Buffer | Uint8Array | null | undefined,
  info: Buffer | Uint8Array | string,
  length = 32
): Buffer {
  return Buffer.from(crypto.hkdfSync('sha512', ikm, salt ?? Buffer.alloc(64), info, length));
}

export function chachaSeal(
  key: Buffer | Uint8Array,
  nonce: Buffer | Uint8Array,
  plaintext: Buffer | Uint8Array,
  aad: Buffer | Uint8Array = Buffer.alloc(0)
): Buffer {
  const cipher = crypto.createCipheriv('chacha20-poly1305', key, nonce, { authTagLength: 16 });
  cipher.setAAD(aad, { plaintextLength: plaintext.length });
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([body, cipher.getAuthTag()]);
}

export function chachaOpen(
  key: Buffer | Uint8Array,
  nonce: Buffer | Uint8Array,
  sealed: Buffer,
  aad: Buffer | Uint8Array = Buffer.alloc(0)
): Buffer {
  if (sealed.length < 16) throw new Error('ciphertext too short');
  const decipher = crypto.createDecipheriv('chacha20-poly1305', key, nonce, {
    authTagLength: 16,
  });
  decipher.setAAD(aad, { plaintextLength: sealed.length - 16 });
  decipher.setAuthTag(sealed.subarray(sealed.length - 16));
  return Buffer.concat([decipher.update(sealed.subarray(0, sealed.length - 16)), decipher.final()]);
}

function rawPublicKey(keyObject: crypto.KeyObject): Buffer {
  return Buffer.from(keyObject.export({ format: 'jwk' }).x as string, 'base64url');
}

export class Ed25519 {
  readonly seed: Buffer;
  readonly privateKey: crypto.KeyObject;
  readonly publicKey: Buffer;

  constructor(seed?: Buffer | null) {
    this.seed = seed ?? crypto.randomBytes(32);
    if (this.seed.length !== 32) throw new Error('ed25519 seed must be 32 bytes');
    this.privateKey = crypto.createPrivateKey({
      key: Buffer.concat([ED25519_PKCS8_PREFIX, this.seed]),
      format: 'der',
      type: 'pkcs8',
    });
    this.publicKey = rawPublicKey(crypto.createPublicKey(this.privateKey));
  }

  sign(message: Buffer | Uint8Array): Buffer {
    return crypto.sign(null, message, this.privateKey);
  }

  static verify(
    publicKey: Buffer | Uint8Array,
    message: Buffer | Uint8Array,
    signature: Buffer | Uint8Array
  ): boolean {
    const key = crypto.createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, publicKey]),
      format: 'der',
      type: 'spki',
    });
    return crypto.verify(null, message, key, signature);
  }
}

export class X25519 {
  readonly seed: Buffer;
  readonly privateKey: crypto.KeyObject;
  readonly publicKey: Buffer;

  constructor(seed?: Buffer | null) {
    this.seed = seed ?? crypto.randomBytes(32);
    this.privateKey = crypto.createPrivateKey({
      key: Buffer.concat([X25519_PKCS8_PREFIX, this.seed]),
      format: 'der',
      type: 'pkcs8',
    });
    this.publicKey = rawPublicKey(crypto.createPublicKey(this.privateKey));
  }

  exchange(peerPublicKey: Buffer | Uint8Array): Buffer {
    const publicKey = crypto.createPublicKey({
      key: Buffer.concat([X25519_SPKI_PREFIX, peerPublicKey]),
      format: 'der',
      type: 'spki',
    });
    return crypto.diffieHellman({ privateKey: this.privateKey, publicKey });
  }
}

// SipHash-2-4, used for the mDNS authTag of a pairable host.
const MASK = (1n << 64n) - 1n;
const rotl = (x: bigint, b: number): bigint => ((x << BigInt(b)) | (x >> BigInt(64 - b))) & MASK;

export function siphash24(key: Buffer, data: Buffer): bigint {
  if (key.length !== 16) throw new Error('SipHash key must be 16 bytes');
  let v0 = key.readBigUInt64LE(0) ^ 0x736f6d6570736575n;
  let v1 = key.readBigUInt64LE(8) ^ 0x646f72616e646f6dn;
  let v2 = key.readBigUInt64LE(0) ^ 0x6c7967656e657261n;
  let v3 = key.readBigUInt64LE(8) ^ 0x7465646279746573n;
  const round = (): void => {
    v0 = (v0 + v1) & MASK;
    v1 = rotl(v1, 13);
    v1 ^= v0;
    v0 = rotl(v0, 32);
    v2 = (v2 + v3) & MASK;
    v3 = rotl(v3, 16);
    v3 ^= v2;
    v0 = (v0 + v3) & MASK;
    v3 = rotl(v3, 21);
    v3 ^= v0;
    v2 = (v2 + v1) & MASK;
    v1 = rotl(v1, 17);
    v1 ^= v2;
    v2 = rotl(v2, 32);
  };
  const end = data.length - (data.length % 8);
  for (let offset = 0; offset < end; offset += 8) {
    const m = data.readBigUInt64LE(offset);
    v3 ^= m;
    round();
    round();
    v0 ^= m;
  }
  let last = BigInt(data.length & 0xff) << 56n;
  for (let i = 0; i < data.length - end; i += 1) {
    last |= BigInt(data[end + i]) << BigInt(8 * i);
  }
  v3 ^= last;
  round();
  round();
  v0 ^= last;
  v2 ^= 0xffn;
  round();
  round();
  round();
  round();
  return (v0 ^ v1 ^ v2 ^ v3) & MASK;
}

/** 6-byte authTag: SipHash-2-4(altIRK, identifier) little-endian, first 6 bytes reversed. */
export function computeAuthTag(altIrk: Buffer, identifier: string): Buffer {
  const output = Buffer.alloc(8);
  output.writeBigUInt64LE(siphash24(altIrk, Buffer.from(identifier, 'utf8')));
  return Buffer.from([output[5], output[4], output[3], output[2], output[1], output[0]]);
}
