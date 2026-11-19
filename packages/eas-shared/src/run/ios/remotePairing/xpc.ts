// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// RemoteXPC message serialisation (the wire format remoted speaks over HTTP/2 DATA frames).
import crypto from 'crypto';

export const XPC_WRAPPER_MAGIC = 0x29b00b92;
export const XPC_PAYLOAD_MAGIC = 0x42133742;
export const XPC_PROTOCOL_VERSION = 5;

export const XpcFlags = Object.freeze({
  ALWAYS_SET: 0x00000001,
  PING: 0x00000002,
  DATA_PRESENT: 0x00000100,
  WANTING_REPLY: 0x00010000,
  REPLY: 0x00020000,
  FILE_TX_STREAM_REQUEST: 0x00100000,
  FILE_TX_STREAM_RESPONSE: 0x00200000,
  INIT_HANDSHAKE: 0x00400000,
} as const);

const T = Object.freeze({
  NULL: 0x1000,
  BOOL: 0x2000,
  INT64: 0x3000,
  UINT64: 0x4000,
  DOUBLE: 0x5000,
  POINTER: 0x6000,
  DATE: 0x7000,
  DATA: 0x8000,
  STRING: 0x9000,
  UUID: 0xa000,
  FD: 0xb000,
  SHMEM: 0xc000,
  ARRAY: 0xe000,
  DICTIONARY: 0xf000,
  FILE_TRANSFER: 0x1a000,
} as const);

type BigIntLike = bigint | number | string | boolean;

/** Explicitly typed integers. Plain JS integers encode as INT64. */
export class XpcUInt64 {
  readonly value: bigint;
  constructor(value: BigIntLike) {
    this.value = BigInt(value);
  }
}

export class XpcInt64 {
  readonly value: bigint;
  constructor(value: BigIntLike) {
    this.value = BigInt(value);
  }
}

export class XpcUuid {
  readonly bytes: Buffer;

  constructor(value: Buffer | string) {
    this.bytes = Buffer.isBuffer(value) ? value : Buffer.from(value.replace(/-/g, ''), 'hex');
    if (this.bytes.length !== 16) throw new TypeError('uuid must be 16 bytes');
  }

  toString(): string {
    const hex = this.bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  static random(): XpcUuid {
    return new XpcUuid(crypto.randomBytes(16));
  }
}

export class XpcFileTransfer {
  readonly size: bigint;
  readonly transferId: bigint;

  constructor(size: BigIntLike, transferId: BigIntLike = 0) {
    this.size = BigInt(size);
    this.transferId = BigInt(transferId);
  }
}

/**
 * A decoded XPC value. INT64/UINT64 decode as number when safe, otherwise bigint;
 * FD/SHMEM/POINTER decode as null.
 */
export type XpcValue =
  | null
  | boolean
  | number
  | bigint
  | string
  | Buffer
  | Date
  | XpcUuid
  | XpcFileTransfer
  | XpcValue[]
  | XpcDictionary;

export interface XpcDictionary {
  [key: string]: XpcValue;
}

export const uint64 = (value: BigIntLike): XpcUInt64 => new XpcUInt64(value);
export const int64 = (value: BigIntLike): XpcInt64 => new XpcInt64(value);

const align4 = (length: number): number => (length + 3) & ~3;

function u32(value: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(value);
  return b;
}

function u64(value: bigint | number): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt.asUintN(64, BigInt(value)));
  return b;
}

function i64(value: bigint | number): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(BigInt.asIntN(64, BigInt(value)));
  return b;
}

function alignedBytes(bytes: Buffer): Buffer {
  const padded = Buffer.alloc(align4(bytes.length));
  bytes.copy(padded);
  return padded;
}

function encodeObject(value: unknown): Buffer {
  if (value === null || value === undefined) return u32(T.NULL);
  if (typeof value === 'boolean') return Buffer.concat([u32(T.BOOL), u32(value ? 1 : 0)]);
  if (value instanceof XpcUInt64) return Buffer.concat([u32(T.UINT64), u64(value.value)]);
  if (value instanceof XpcInt64) return Buffer.concat([u32(T.INT64), i64(value.value)]);
  if (typeof value === 'bigint') return Buffer.concat([u32(T.INT64), i64(value)]);
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return Buffer.concat([u32(T.INT64), i64(value)]);
    const b = Buffer.alloc(8);
    b.writeDoubleLE(value);
    return Buffer.concat([u32(T.DOUBLE), b]);
  }
  if (typeof value === 'string') {
    const bytes = Buffer.from(value + '\0', 'utf8');
    return Buffer.concat([u32(T.STRING), u32(bytes.length), alignedBytes(bytes)]);
  }
  if (value instanceof Date) {
    return Buffer.concat([u32(T.DATE), u64(BigInt(value.getTime()) * 1_000_000n)]);
  }
  if (value instanceof XpcUuid) return Buffer.concat([u32(T.UUID), value.bytes]);
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    const bytes = Buffer.from(value);
    return Buffer.concat([u32(T.DATA), u32(bytes.length), alignedBytes(bytes)]);
  }
  if (value instanceof XpcFileTransfer) {
    const body = Buffer.concat([
      u64(value.transferId),
      encodeObject({ s: new XpcUInt64(value.size) }),
    ]);
    return Buffer.concat([u32(T.FILE_TRANSFER), body]);
  }
  if (Array.isArray(value)) {
    const entries = value.map(encodeObject);
    const body = Buffer.concat([u32(entries.length), ...entries]);
    return Buffer.concat([u32(T.ARRAY), u32(body.length), body]);
  }
  if (typeof value === 'object') {
    const entries: Buffer[] = [];
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue;
      const keyBytes = Buffer.from(key + '\0', 'utf8');
      entries.push(alignedBytes(keyBytes), encodeObject(item));
    }
    const body = Buffer.concat([u32(entries.length / 2), ...entries]);
    return Buffer.concat([u32(T.DICTIONARY), u32(body.length), body]);
  }
  throw new TypeError(`xpc cannot encode ${typeof value}`);
}

export interface XpcWrapperInput {
  flags?: number;
  messageId?: number | bigint;
  /** Any encodable value (plain objects, arrays, Xpc* wrappers, Buffers, ...); null for none. */
  payload?: unknown;
}

/** Build a full XpcWrapper (used inside an HTTP/2 DATA frame). */
export function encodeXpcWrapper({
  flags = XpcFlags.ALWAYS_SET,
  messageId = 0,
  payload = null,
}: XpcWrapperInput): Buffer {
  const message = Buffer.concat([
    u64(messageId),
    payload === null
      ? Buffer.alloc(0)
      : Buffer.concat([u32(XPC_PAYLOAD_MAGIC), u32(XPC_PROTOCOL_VERSION), encodeObject(payload)]),
  ]);
  return Buffer.concat([
    u32(XPC_WRAPPER_MAGIC),
    u32(flags >>> 0),
    u64(message.length - 8),
    message,
  ]);
}

export interface XpcMessageOptions {
  messageId?: number | bigint;
  wantingReply?: boolean;
}

/** Convenience: a data-carrying request wrapper. */
export function encodeXpcMessage(
  body: object,
  { messageId = 0, wantingReply = false }: XpcMessageOptions = {}
): Buffer {
  let flags: number = XpcFlags.ALWAYS_SET;
  if (Object.keys(body).length > 0) flags |= XpcFlags.DATA_PRESENT;
  if (wantingReply) flags |= XpcFlags.WANTING_REPLY;
  return encodeXpcWrapper({ flags, messageId, payload: body });
}

export interface XpcWrapper {
  flags: number;
  messageId: bigint;
  /** Decoded payload (normally an XpcDictionary), or null when the wrapper carries none. */
  payload: XpcValue;
  /** Total bytes consumed from the input buffer. */
  length: number;
}

/**
 * Parse one XpcWrapper from the start of `buffer`. Returns null when more bytes are needed.
 * Result: { flags, messageId, payload (decoded object or null), length }.
 */
export function decodeXpcWrapper(buffer: Buffer): XpcWrapper | null {
  if (buffer.length < 16) return null;
  if (buffer.readUInt32LE(0) !== XPC_WRAPPER_MAGIC) throw new Error('invalid XPC wrapper magic');
  const flags = buffer.readUInt32LE(4);
  const size = Number(buffer.readBigUInt64LE(8)) + 8;
  if (buffer.length < 16 + size) return null;
  const message = buffer.subarray(16, 16 + size);
  const messageId = message.readBigUInt64LE(0);
  let payload: XpcValue = null;
  if (message.length > 8) {
    if (message.readUInt32LE(8) !== XPC_PAYLOAD_MAGIC) throw new Error('invalid XPC payload magic');
    const reader: Reader = { buffer: message, offset: 16 };
    payload = decodeObject(reader);
  }
  return { flags, messageId, payload, length: 16 + size };
}

interface Reader {
  buffer: Buffer;
  offset: number;
}

function decodeObject(reader: Reader): XpcValue {
  const { buffer } = reader;
  const type = buffer.readUInt32LE(reader.offset);
  reader.offset += 4;
  switch (type) {
    case T.NULL:
      return null;
    case T.BOOL: {
      const v = buffer.readUInt32LE(reader.offset) !== 0;
      reader.offset += 4;
      return v;
    }
    case T.INT64: {
      const v = buffer.readBigInt64LE(reader.offset);
      reader.offset += 8;
      return safeNumber(v);
    }
    case T.UINT64: {
      const v = buffer.readBigUInt64LE(reader.offset);
      reader.offset += 8;
      return safeNumber(v);
    }
    case T.DOUBLE: {
      const v = buffer.readDoubleLE(reader.offset);
      reader.offset += 8;
      return v;
    }
    case T.DATE: {
      const v = buffer.readBigUInt64LE(reader.offset);
      reader.offset += 8;
      return new Date(Number(v / 1_000_000n));
    }
    case T.DATA: {
      const length = buffer.readUInt32LE(reader.offset);
      const bytes = Buffer.from(buffer.subarray(reader.offset + 4, reader.offset + 4 + length));
      reader.offset += 4 + align4(length);
      return bytes;
    }
    case T.STRING: {
      const length = buffer.readUInt32LE(reader.offset);
      const text = buffer
        .subarray(reader.offset + 4, reader.offset + 4 + length - 1)
        .toString('utf8');
      reader.offset += 4 + align4(length);
      return text;
    }
    case T.UUID: {
      const bytes = Buffer.from(buffer.subarray(reader.offset, reader.offset + 16));
      reader.offset += 16;
      return new XpcUuid(bytes);
    }
    case T.FD: {
      reader.offset += 4;
      return null;
    }
    case T.SHMEM: {
      reader.offset += 8;
      return null;
    }
    case T.POINTER:
      return null;
    case T.ARRAY: {
      const length = buffer.readUInt32LE(reader.offset);
      const end = reader.offset + 4 + length;
      const count = buffer.readUInt32LE(reader.offset + 4);
      reader.offset += 8;
      const items: XpcValue[] = [];
      for (let i = 0; i < count; i += 1) items.push(decodeObject(reader));
      reader.offset = end;
      return items;
    }
    case T.DICTIONARY: {
      const length = buffer.readUInt32LE(reader.offset);
      const end = reader.offset + 4 + length;
      const count = buffer.readUInt32LE(reader.offset + 4);
      reader.offset += 8;
      const result: XpcDictionary = {};
      for (let i = 0; i < count; i += 1) {
        const terminator = buffer.indexOf(0, reader.offset);
        const key = buffer.subarray(reader.offset, terminator).toString('utf8');
        reader.offset += align4(terminator - reader.offset + 1);
        result[key] = decodeObject(reader);
      }
      reader.offset = end;
      return result;
    }
    case T.FILE_TRANSFER: {
      const transferId = buffer.readBigUInt64LE(reader.offset);
      reader.offset += 8;
      const dict = decodeObject(reader) as XpcDictionary | null;
      return new XpcFileTransfer((dict?.s as number | bigint | undefined) ?? 0, transferId);
    }
    default:
      throw new Error(`unsupported XPC type 0x${type.toString(16)}`);
  }
}

function safeNumber(value: bigint): number | bigint {
  return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : value;
}
