// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// SRP-6a over the RFC 5054 3072-bit group with SHA-512, byte-for-byte compatible with the
// srptools conventions Apple's Pair-Setup (and pymobiledevice3) rely on: k = H(N | PAD(g)),
// u = H(PAD(A) | PAD(B)), everything else hashed as minimal big-endian integers.
import crypto from 'crypto';

const PRIME_3072_HEX =
  'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA6' +
  '3B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245' +
  'E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F2411' +
  '7C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F' +
  '83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08' +
  'CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9' +
  'DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D' +
  '04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7' +
  'ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D8760273' +
  '3EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB31' +
  '43DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF';

export const N = BigInt('0x' + PRIME_3072_HEX);
export const g = 5n;
export const N_BYTES = 384;
export const SRP_USERNAME = 'Pair-Setup';

export function bytesToBigInt(bytes: Buffer | Uint8Array): bigint {
  return bytes.length === 0 ? 0n : BigInt('0x' + Buffer.from(bytes).toString('hex'));
}

/** Minimal big-endian encoding (no leading zeros), matching srptools' int_to_bytes. */
export function bigIntToBytes(value: bigint): Buffer {
  let hex = value.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  return Buffer.from(hex, 'hex');
}

export function pad(value: bigint): Buffer {
  const bytes = bigIntToBytes(value);
  if (bytes.length >= N_BYTES) return bytes;
  return Buffer.concat([Buffer.alloc(N_BYTES - bytes.length), bytes]);
}

export function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n;
  base %= modulus;
  while (exponent > 0n) {
    if (exponent & 1n) result = (result * base) % modulus;
    exponent >>= 1n;
    base = (base * base) % modulus;
  }
  return result;
}

type HashPart = bigint | string | Buffer | Uint8Array;

function H(...parts: HashPart[]): Buffer {
  const hash = crypto.createHash('sha512');
  for (const part of parts) {
    if (typeof part === 'bigint') hash.update(bigIntToBytes(part));
    else if (typeof part === 'string') hash.update(Buffer.from(part, 'utf8'));
    else hash.update(part);
  }
  return hash.digest();
}

const Hint = (...parts: HashPart[]): bigint => bytesToBigInt(H(...parts));

export const k = Hint(N, pad(g));

export function randomBigInt(bits = 1024): bigint {
  return bytesToBigInt(crypto.randomBytes(bits / 8));
}

function passwordHash(salt: Buffer, username: string, password: string): bigint {
  // x = H(s | H(I ":" P))
  return Hint(salt, H(username, ':', password));
}

export function verifier(salt: Buffer, username: string, password: string): bigint {
  return modPow(g, passwordHash(salt, username, password), N);
}

interface SessionProofInput {
  username: string;
  salt: Buffer;
  A: bigint;
  B: bigint;
  K: Buffer;
}

function sessionProofs({ username, salt, A, B, K }: SessionProofInput): {
  M1: Buffer;
  M2: Buffer;
} {
  const M1 = H(Hint(N) ^ Hint(g), Hint(username), salt, A, B, K);
  const M2 = H(A, M1, K);
  return { M1, M2 };
}

export interface SrpServerOptions {
  username?: string;
  password: string;
  salt: Buffer;
  privateKey?: bigint;
}

export class SrpServer {
  readonly username: string;
  readonly salt: Buffer;
  readonly v: bigint;
  readonly b: bigint;
  readonly B: bigint;
  /** Session key, M1 (client proof) and M2 (server proof); set by `process()`. */
  K!: Buffer;
  M1!: Buffer;
  M2!: Buffer;

  constructor({ username = SRP_USERNAME, password, salt, privateKey }: SrpServerOptions) {
    this.username = username;
    this.salt = salt;
    this.v = verifier(salt, username, password);
    this.b = privateKey ?? randomBigInt();
    this.B = (k * this.v + modPow(g, this.b, N)) % N;
  }

  get publicKey(): Buffer {
    return bigIntToBytes(this.B);
  }

  /** Process the client's public value, derive K and both proofs. */
  process(clientPublic: Buffer | Uint8Array): Buffer {
    const A = bytesToBigInt(clientPublic);
    if (A % N === 0n) throw new Error('invalid SRP client public value');
    const u = Hint(pad(A), pad(this.B));
    const S = modPow((A * modPow(this.v, u, N)) % N, this.b, N);
    this.K = H(S);
    const { M1, M2 } = sessionProofs({
      username: this.username,
      salt: this.salt,
      A,
      B: this.B,
      K: this.K,
    });
    this.M1 = M1;
    this.M2 = M2;
    return this.K;
  }

  verifyClientProof(proof: Buffer): boolean {
    return this.M1.length === proof.length && crypto.timingSafeEqual(this.M1, proof);
  }
}

export interface SrpClientOptions {
  username?: string;
  password: string;
  privateKey?: bigint;
}

export class SrpClient {
  readonly username: string;
  readonly password: string;
  readonly a: bigint;
  readonly A: bigint;
  /** Session key, M1 (client proof) and M2 (server proof); set by `process()`. */
  K!: Buffer;
  M1!: Buffer;
  M2!: Buffer;

  constructor({ username = SRP_USERNAME, password, privateKey }: SrpClientOptions) {
    this.username = username;
    this.password = password;
    this.a = privateKey ?? randomBigInt();
    this.A = modPow(g, this.a, N);
  }

  get publicKey(): Buffer {
    return bigIntToBytes(this.A);
  }

  process(serverPublic: Buffer | Uint8Array, salt: Buffer): Buffer {
    const B = bytesToBigInt(serverPublic);
    if (B % N === 0n) throw new Error('invalid SRP server public value');
    const x = passwordHash(salt, this.username, this.password);
    const u = Hint(pad(this.A), pad(B));
    const base = (((B - ((k * modPow(g, x, N)) % N)) % N) + N) % N;
    const S = modPow(base, this.a + u * x, N);
    this.K = H(S);
    const { M1, M2 } = sessionProofs({ username: this.username, salt, A: this.A, B, K: this.K });
    this.M1 = M1;
    this.M2 = M2;
    return this.K;
  }

  verifyServerProof(proof: Buffer): boolean {
    return this.M2.length === proof.length && crypto.timingSafeEqual(this.M2, proof);
  }
}
