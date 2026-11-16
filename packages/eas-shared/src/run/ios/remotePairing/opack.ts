// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// OPACK (Apple's compact binary object format) encoder/decoder, mirroring opack2's dialect.
const MAC_EPOCH_OFFSET = 2082844800; // seconds between 1904-01-01 and 1970-01-01

/** A decoded OPACK value. Integers above 2^53 decode as bigint. */
export type OpackValue =
  | boolean
  | number
  | bigint
  | string
  | Buffer
  | Date
  | OpackValue[]
  | { [key: string]: OpackValue };

/** Values accepted by `encodeOpack` (also allows Uint8Array and Map). */
export type OpackInput =
  | boolean
  | number
  | bigint
  | string
  | Buffer
  | Uint8Array
  | Date
  | readonly OpackInput[]
  | Map<OpackInput, OpackInput>
  | { [key: string]: OpackInput };

export function encodeOpack(value: OpackInput): Buffer {
  const out: Buffer[] = [];
  write(value, out);
  return Buffer.concat(out);
}

function write(value: unknown, out: Buffer[]): void {
  if (value === null || value === undefined) {
    // OPACK has no null in this dialect; encode as empty data like the reference does not.
    throw new TypeError('OPACK cannot encode null');
  }
  if (typeof value === 'boolean') {
    out.push(Buffer.from([value ? 1 : 2]));
    return;
  }
  if (value instanceof Date) {
    const buffer = Buffer.alloc(9);
    buffer[0] = 6;
    buffer.writeDoubleLE(value.getTime() / 1000 + MAC_EPOCH_OFFSET, 1);
    out.push(buffer);
    return;
  }
  if (typeof value === 'bigint') value = Number(value);
  if (typeof value === 'number') {
    if (Number.isInteger(value) && value >= 0) {
      if (value <= 0x27) {
        out.push(Buffer.from([value + 8]));
        return;
      }
      if (value <= 0xff) {
        out.push(Buffer.from([0x30, value]));
        return;
      }
      if (value <= 0xffffffff) {
        const buffer = Buffer.alloc(5);
        buffer[0] = 0x32;
        buffer.writeUInt32LE(value, 1);
        out.push(buffer);
        return;
      }
      const buffer = Buffer.alloc(9);
      buffer[0] = 0x33;
      buffer.writeBigUInt64LE(BigInt(value), 1);
      out.push(buffer);
      return;
    }
    if (Math.fround(value) === value) {
      const buffer = Buffer.alloc(5);
      buffer[0] = 0x35;
      buffer.writeFloatLE(value, 1);
      out.push(buffer);
      return;
    }
    const buffer = Buffer.alloc(9);
    buffer[0] = 0x36;
    buffer.writeDoubleLE(value, 1);
    out.push(buffer);
    return;
  }
  if (typeof value === 'string') {
    const bytes = Buffer.from(value, 'utf8');
    if (bytes.length <= 0x20) out.push(Buffer.from([0x40 + bytes.length]), bytes);
    else out.push(lengthPrefixed(0x61, bytes));
    return;
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    const bytes = Buffer.from(value);
    if (bytes.length <= 0x20) out.push(Buffer.from([0x70 + bytes.length]), bytes);
    else out.push(lengthPrefixed(0x91, bytes));
    return;
  }
  if (Array.isArray(value)) {
    if (value.length < 15) {
      out.push(Buffer.from([0xd0 + value.length]));
      for (const item of value) write(item, out);
      return;
    }
    out.push(Buffer.from([0xdf]));
    for (const item of value) write(item, out);
    out.push(Buffer.from([3]));
    return;
  }
  if (typeof value === 'object') {
    const entries: [unknown, unknown][] =
      value instanceof Map ? [...value.entries()] : Object.entries(value as object);
    if (entries.length < 15) {
      out.push(Buffer.from([0xe0 + entries.length]));
      for (const [key, item] of entries) {
        write(key, out);
        write(item, out);
      }
      return;
    }
    out.push(Buffer.from([0xef]));
    for (const [key, item] of entries) {
      write(key, out);
      write(item, out);
    }
    out.push(Buffer.from([3, 3]));
    return;
  }
  throw new TypeError(`OPACK cannot encode ${typeof value}`);
}

function lengthPrefixed(base: number, bytes: Buffer): Buffer {
  if (bytes.length <= 0xff) return Buffer.concat([Buffer.from([base, bytes.length]), bytes]);
  if (bytes.length <= 0xffff) {
    const header = Buffer.alloc(3);
    header[0] = base + 1;
    header.writeUInt16BE(bytes.length, 1);
    return Buffer.concat([header, bytes]);
  }
  const header = Buffer.alloc(5);
  header[0] = base + 2;
  header.writeUInt32BE(bytes.length, 1);
  return Buffer.concat([header, bytes]);
}

const TERMINATOR = Symbol('opack-terminator');

interface Reader {
  buffer: Buffer;
  offset: number;
}

export function decodeOpack(buffer: Buffer): OpackValue {
  const reader: Reader = { buffer, offset: 0 };
  const value = read(reader);
  return value as OpackValue;
}

function read(reader: Reader): OpackValue | typeof TERMINATOR {
  const { buffer } = reader;
  const type = buffer[reader.offset];
  if (type === undefined) throw new Error('truncated OPACK');
  reader.offset += 1;
  if (type === 1) return true;
  if (type === 2) return false;
  if (type === 3) return TERMINATOR;
  if (type === 6) {
    const seconds = buffer.readDoubleLE(reader.offset);
    reader.offset += 8;
    return new Date((seconds - MAC_EPOCH_OFFSET) * 1000);
  }
  if (type >= 8 && type <= 0x2f) return type - 8;
  if (type === 0x30) return buffer[reader.offset++];
  if (type === 0x32) {
    const v = buffer.readUInt32LE(reader.offset);
    reader.offset += 4;
    return v;
  }
  if (type === 0x33) {
    const v = buffer.readBigUInt64LE(reader.offset);
    reader.offset += 8;
    return v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v;
  }
  if (type === 0x35) {
    const v = buffer.readFloatLE(reader.offset);
    reader.offset += 4;
    return v;
  }
  if (type === 0x36) {
    const v = buffer.readDoubleLE(reader.offset);
    reader.offset += 8;
    return v;
  }
  if (type >= 0x40 && type <= 0x60) return take(reader, type - 0x40).toString('utf8');
  if (type >= 0x61 && type <= 0x64) {
    return take(reader, readLength(reader, type - 0x61)).toString('utf8');
  }
  if (type >= 0x70 && type <= 0x90) return take(reader, type - 0x70);
  if (type >= 0x91 && type <= 0x94) return take(reader, readLength(reader, type - 0x91));
  if (type >= 0xd0 && type <= 0xde) {
    const items: OpackValue[] = [];
    for (let i = 0; i < type - 0xd0; i += 1) items.push(read(reader) as OpackValue);
    return items;
  }
  if (type === 0xdf) {
    const items: OpackValue[] = [];
    for (;;) {
      const item = read(reader);
      if (item === TERMINATOR) return items;
      items.push(item);
    }
  }
  if (type >= 0xe0 && type <= 0xee) {
    const result: { [key: string]: OpackValue } = {};
    for (let i = 0; i < type - 0xe0; i += 1) {
      const key = read(reader);
      result[String(key)] = read(reader) as OpackValue;
    }
    return result;
  }
  if (type === 0xef) {
    const result: { [key: string]: OpackValue } = {};
    for (;;) {
      const key = read(reader);
      if (key === TERMINATOR) {
        read(reader);
        return result;
      }
      result[String(key)] = read(reader) as OpackValue;
    }
  }
  throw new Error(`invalid OPACK type 0x${type.toString(16)}`);
}

function readLength(reader: Reader, width: number): number {
  const { buffer } = reader;
  let length: number;
  if (width === 0) {
    length = buffer[reader.offset];
    reader.offset += 1;
  } else if (width === 1) {
    length = buffer.readUInt16BE(reader.offset);
    reader.offset += 2;
  } else if (width === 2) {
    length = buffer.readUInt32BE(reader.offset);
    reader.offset += 4;
  } else {
    length = Number(buffer.readBigUInt64BE(reader.offset));
    reader.offset += 8;
  }
  return length;
}

function take(reader: Reader, length: number): Buffer {
  const slice = reader.buffer.subarray(reader.offset, reader.offset + length);
  if (slice.length !== length) throw new Error('truncated OPACK');
  reader.offset += length;
  return Buffer.from(slice);
}
