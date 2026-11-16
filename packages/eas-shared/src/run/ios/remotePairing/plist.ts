// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// Property list support: XML writer, XML parser, and binary (bplist00) parser.
// Enough for pair records and lockdown-style service messages.

/** A keyed-archive object reference (`CF$UID`). */
export class PlistUid {
  constructor(public value: number) {}
}

/** A decoded property list value. Integers outside the safe range decode as bigint. */
export type PlistValue =
  | string
  | number
  | bigint
  | boolean
  | Date
  | Buffer
  | PlistUid
  | null
  | PlistValue[]
  | PlistDictionary;

export interface PlistDictionary {
  [key: string]: PlistValue;
}

export function toXmlPlist(value: unknown): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" ' +
    '"http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
    '<plist version="1.0">\n' +
    `${writeXml(value, 0)}</plist>\n`
  );
}

const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function writeXml(value: unknown, depth: number): string {
  const pad = '\t'.repeat(depth);
  if (value === true) return `${pad}<true/>\n`;
  if (value === false) return `${pad}<false/>\n`;
  if (typeof value === 'string') return `${pad}<string>${escapeXml(value)}</string>\n`;
  if (typeof value === 'bigint') return `${pad}<integer>${value}</integer>\n`;
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? `${pad}<integer>${value}</integer>\n`
      : `${pad}<real>${value}</real>\n`;
  }
  if (value instanceof Date) {
    return `${pad}<date>${value.toISOString().replace(/\.\d+Z$/, 'Z')}</date>\n`;
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return `${pad}<data>${Buffer.from(value).toString('base64')}</data>\n`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}<array/>\n`;
    const items = value.map((item) => writeXml(item, depth + 1)).join('');
    return `${pad}<array>\n${items}${pad}</array>\n`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined && item !== null);
    if (entries.length === 0) return `${pad}<dict/>\n`;
    const body = entries
      .map(([key, item]) => `${pad}\t<key>${escapeXml(key)}</key>\n${writeXml(item, depth + 1)}`)
      .join('');
    return `${pad}<dict>\n${body}${pad}</dict>\n`;
  }
  throw new TypeError(`plist cannot encode ${typeof value}`);
}

/**
 * Parse an XML or binary property list. The result type defaults to `PlistValue`; callers that
 * know the shape (e.g. a pair record) can pass it as `T`.
 */
export function parsePlist<T = PlistValue>(input: Buffer | Uint8Array | string): T {
  let buffer: Buffer;
  if (Buffer.isBuffer(input)) buffer = input;
  else if (typeof input === 'string') buffer = Buffer.from(input);
  else buffer = Buffer.from(input);
  if (buffer.subarray(0, 8).toString('latin1') === 'bplist00') {
    return parseBinaryPlist(buffer) as T;
  }
  return parseXmlPlist(buffer.toString('utf8')) as T;
}

// ---- XML ----

type XmlToken =
  | { kind: 'open'; name: string; selfClosing: boolean }
  | { kind: 'close'; name: string }
  | { kind: 'text'; value: string };

function parseXmlPlist(text: string): PlistValue {
  const tokens = tokenize(text);
  let index = 0;
  const peek = (): XmlToken | undefined => tokens[index];
  const next = (): XmlToken | undefined => tokens[index++];
  const unescape = (value: string): string =>
    value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&amp;/g, '&');
  const isClose = (token: XmlToken | undefined, name: string): boolean =>
    !!token && token.kind === 'close' && token.name === name;

  function readValue(): PlistValue {
    const token = next();
    if (!token || token.kind !== 'open') {
      throw new Error(`plist: unexpected token ${JSON.stringify(token)}`);
    }
    const { name, selfClosing } = token;
    if (name === 'true' || name === 'false') return name === 'true';
    if (selfClosing) {
      if (name === 'dict') return {};
      if (name === 'array') return [];
      if (name === 'string' || name === 'key') return '';
      if (name === 'data') return Buffer.alloc(0);
      throw new Error(`plist: unexpected empty <${name}/>`);
    }
    if (name === 'dict') {
      const result: PlistDictionary = {};
      while (peek() && !isClose(peek(), 'dict')) {
        const keyToken = next()!;
        if (keyToken.kind !== 'open' || keyToken.name !== 'key') {
          throw new Error('plist: expected <key>');
        }
        const key = keyToken.selfClosing ? '' : unescape(readText());
        if (!keyToken.selfClosing) expectClose('key');
        result[key] = readValue();
      }
      expectClose('dict');
      return result;
    }
    if (name === 'array') {
      const result: PlistValue[] = [];
      while (peek() && !isClose(peek(), 'array')) result.push(readValue());
      expectClose('array');
      return result;
    }
    const text = readText();
    expectClose(name);
    switch (name) {
      case 'string':
        return unescape(text);
      case 'integer': {
        const n = BigInt(text.trim());
        return n >= BigInt(Number.MIN_SAFE_INTEGER) && n <= BigInt(Number.MAX_SAFE_INTEGER)
          ? Number(n)
          : n;
      }
      case 'real':
        return Number(text.trim());
      case 'date':
        return new Date(text.trim());
      case 'data':
        return Buffer.from(text.replace(/\s+/g, ''), 'base64');
      default:
        throw new Error(`plist: unknown element <${name}>`);
    }
  }

  function readText(): string {
    const token = peek();
    if (token && token.kind === 'text') {
      next();
      return token.value;
    }
    return '';
  }

  function expectClose(name: string): void {
    const token = next();
    if (!isClose(token, name)) throw new Error(`plist: expected </${name}>`);
  }

  // Skip to <plist ...>
  const isPlistOpen = (token: XmlToken): boolean => token.kind === 'open' && token.name === 'plist';
  while (peek() && !isPlistOpen(peek()!)) next();
  if (!peek()) throw new Error('plist: missing <plist> root');
  next();
  const value = readValue();
  return value;
}

function tokenize(text: string): XmlToken[] {
  const tokens: XmlToken[] = [];
  let position = 0;
  while (position < text.length) {
    if (text[position] === '<') {
      if (text.startsWith('<!--', position)) {
        position = text.indexOf('-->', position) + 3;
        continue;
      }
      if (text.startsWith('<?', position)) {
        position = text.indexOf('?>', position) + 2;
        continue;
      }
      if (text.startsWith('<!', position)) {
        position = text.indexOf('>', position) + 1;
        continue;
      }
      const end = text.indexOf('>', position);
      if (end < 0) throw new Error('plist: unterminated tag');
      let body = text.slice(position + 1, end).trim();
      position = end + 1;
      if (body.startsWith('/')) {
        tokens.push({ kind: 'close', name: body.slice(1).trim() });
        continue;
      }
      const selfClosing = body.endsWith('/');
      if (selfClosing) body = body.slice(0, -1).trim();
      const name = body.split(/\s/)[0];
      tokens.push({ kind: 'open', name, selfClosing });
    } else {
      const end = text.indexOf('<', position);
      const value = text.slice(position, end < 0 ? text.length : end);
      if (value.trim().length > 0) tokens.push({ kind: 'text', value });
      position = end < 0 ? text.length : end;
    }
  }
  return tokens;
}

// ---- Binary ----

function parseBinaryPlist(buffer: Buffer): PlistValue {
  const trailer = buffer.subarray(buffer.length - 32);
  const offsetSize = trailer[6];
  const refSize = trailer[7];
  const objectCount = Number(trailer.readBigUInt64BE(8));
  const topObject = Number(trailer.readBigUInt64BE(16));
  const tableOffset = Number(trailer.readBigUInt64BE(24));
  const readSized = (offset: number, size: number): number => {
    let value = 0;
    for (let i = 0; i < size; i += 1) value = value * 256 + buffer[offset + i];
    return value;
  };
  const offsets: number[] = [];
  for (let i = 0; i < objectCount; i += 1) {
    offsets.push(readSized(tableOffset + i * offsetSize, offsetSize));
  }

  function readInt(offset: number, size: number): number | bigint {
    if (size === 8) {
      const value = buffer.readBigInt64BE(offset);
      return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(value)
        : value;
    }
    if (size === 16) return buffer.readBigUInt64BE(offset + 8);
    return readSized(offset, size);
  }

  function readLength(offset: number, low: number): { length: number; offset: number } {
    if (low !== 0x0f) return { length: low, offset: offset + 1 };
    const marker = buffer[offset + 1];
    const size = 1 << (marker & 0x0f);
    return { length: readSized(offset + 2, size), offset: offset + 2 + size };
  }

  function readObject(index: number): PlistValue {
    const start = offsets[index];
    const marker = buffer[start];
    const high = marker >> 4;
    const low = marker & 0x0f;
    switch (high) {
      case 0x0:
        if (low === 0x08) return false;
        if (low === 0x09) return true;
        if (low === 0x00) return null;
        throw new Error(`bplist: unsupported marker 0x${marker.toString(16)}`);
      case 0x1:
        return readInt(start + 1, 1 << low);
      case 0x2:
        return low === 2 ? buffer.readFloatBE(start + 1) : buffer.readDoubleBE(start + 1);
      case 0x3:
        return new Date((buffer.readDoubleBE(start + 1) + 978307200) * 1000);
      case 0x4: {
        const { length, offset } = readLength(start, low);
        return Buffer.from(buffer.subarray(offset, offset + length));
      }
      case 0x5: {
        const { length, offset } = readLength(start, low);
        return buffer.subarray(offset, offset + length).toString('latin1');
      }
      case 0x6: {
        const { length, offset } = readLength(start, low);
        const units: number[] = [];
        for (let i = 0; i < length; i += 1) units.push(buffer.readUInt16BE(offset + i * 2));
        return String.fromCharCode(...units);
      }
      case 0x8: {
        let value = 0;
        for (let i = 0; i <= low; i += 1) value = value * 256 + buffer[start + 1 + i];
        return new PlistUid(value);
      }
      case 0xa: {
        const { length, offset } = readLength(start, low);
        const items: PlistValue[] = [];
        for (let i = 0; i < length; i += 1) {
          items.push(readObject(readSized(offset + i * refSize, refSize)));
        }
        return items;
      }
      case 0xd: {
        const { length, offset } = readLength(start, low);
        const result: PlistDictionary = {};
        for (let i = 0; i < length; i += 1) {
          const key = readObject(readSized(offset + i * refSize, refSize));
          result[key as string] = readObject(readSized(offset + (length + i) * refSize, refSize));
        }
        return result;
      }
      default:
        throw new Error(`bplist: unsupported marker 0x${marker.toString(16)}`);
    }
  }
  return readObject(topObject);
}

// ---- Binary plist writer (bplist00) ----

interface FlatObject {
  value: unknown;
  index: number;
  keys?: number[];
  children?: number[];
}

/**
 * Encode a value as a binary property list.
 * Supports dict, array, string, data, int, real, bool, date, null.
 */
export function toBinaryPlist(root: unknown): Buffer {
  const objects: FlatObject[] = [];
  const flatten = (value: unknown): number => {
    const index = objects.length;
    const entry: FlatObject = { value, index };
    objects.push(entry);
    if (Array.isArray(value)) {
      entry.children = value.map(flatten);
    } else if (
      value &&
      typeof value === 'object' &&
      !Buffer.isBuffer(value) &&
      !(value instanceof Uint8Array) &&
      !(value instanceof Date) &&
      !(value instanceof PlistUid)
    ) {
      const entries = Object.entries(value).filter(([, v]) => v !== undefined);
      entry.keys = entries.map(([key]) => flatten(key));
      entry.children = entries.map(([, v]) => flatten(v));
    }
    return index;
  };
  flatten(root);
  const refSize = objects.length < 256 ? 1 : objects.length < 65536 ? 2 : 4;
  const writeRef = (index: number): Buffer => {
    const b = Buffer.alloc(refSize);
    if (refSize === 1) b[0] = index;
    else if (refSize === 2) b.writeUInt16BE(index);
    else b.writeUInt32BE(index);
    return b;
  };
  const encodeInt = (value: number | bigint): Buffer => {
    if (typeof value === 'bigint' || value > 0xffffffff || value < 0) {
      const b = Buffer.alloc(9);
      b[0] = 0x13;
      b.writeBigInt64BE(BigInt(value), 1);
      return b;
    }
    if (value < 256) return Buffer.from([0x10, value]);
    if (value < 65536) {
      const b = Buffer.alloc(3);
      b[0] = 0x11;
      b.writeUInt16BE(value, 1);
      return b;
    }
    const b = Buffer.alloc(5);
    b[0] = 0x12;
    b.writeUInt32BE(value, 1);
    return b;
  };
  const lengthMarker = (high: number, length: number): Buffer => {
    if (length < 15) return Buffer.from([(high << 4) | length]);
    const intBytes = encodeInt(length);
    return Buffer.concat([Buffer.from([(high << 4) | 0x0f]), intBytes]);
  };
  const chunks: Buffer[] = [Buffer.from('bplist00', 'latin1')];
  const offsets: number[] = [];
  let position = 8;
  for (const entry of objects) {
    offsets.push(position);
    const { value } = entry;
    let bytes: Buffer;
    if (value === null || value === undefined) {
      bytes = Buffer.from([0x00]);
    } else if (value instanceof PlistUid) {
      const width = value.value < 256 ? 1 : value.value < 65536 ? 2 : 4;
      bytes = Buffer.alloc(1 + width);
      bytes[0] = 0x80 | (width - 1);
      bytes.writeUIntBE(value.value, 1, width);
    } else if (value === true) {
      bytes = Buffer.from([0x09]);
    } else if (value === false) {
      bytes = Buffer.from([0x08]);
    } else if (typeof value === 'number' && !Number.isInteger(value)) {
      bytes = Buffer.alloc(9);
      bytes[0] = 0x23;
      bytes.writeDoubleBE(value, 1);
    } else if (typeof value === 'number' || typeof value === 'bigint') {
      bytes = encodeInt(value);
    } else if (value instanceof Date) {
      bytes = Buffer.alloc(9);
      bytes[0] = 0x33;
      bytes.writeDoubleBE(value.getTime() / 1000 - 978307200, 1);
    } else if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
      bytes = Buffer.concat([lengthMarker(0x4, value.length), Buffer.from(value)]);
    } else if (typeof value === 'string') {
      // eslint-disable-next-line no-control-regex
      if (/^[\x00-\x7f]*$/.test(value)) {
        bytes = Buffer.concat([lengthMarker(0x5, value.length), Buffer.from(value, 'latin1')]);
      } else {
        const units = Buffer.alloc(value.length * 2);
        for (let i = 0; i < value.length; i += 1) units.writeUInt16BE(value.charCodeAt(i), i * 2);
        bytes = Buffer.concat([lengthMarker(0x6, value.length), units]);
      }
    } else if (Array.isArray(value)) {
      const children = entry.children!;
      bytes = Buffer.concat([lengthMarker(0xa, children.length), ...children.map(writeRef)]);
    } else {
      const children = entry.children!;
      bytes = Buffer.concat([
        lengthMarker(0xd, children.length),
        ...entry.keys!.map(writeRef),
        ...children.map(writeRef),
      ]);
    }
    chunks.push(bytes);
    position += bytes.length;
  }
  const offsetSize = position < 256 ? 1 : position < 65536 ? 2 : 4;
  const table = Buffer.alloc(offsets.length * offsetSize);
  offsets.forEach((offset, i) => {
    if (offsetSize === 1) table[i] = offset;
    else if (offsetSize === 2) table.writeUInt16BE(offset, i * 2);
    else table.writeUInt32BE(offset, i * 4);
  });
  const trailer = Buffer.alloc(32);
  trailer[6] = offsetSize;
  trailer[7] = refSize;
  trailer.writeBigUInt64BE(BigInt(objects.length), 8);
  trailer.writeBigUInt64BE(0n, 16);
  trailer.writeBigUInt64BE(BigInt(position), 24);
  return Buffer.concat([...chunks, table, trailer]);
}
