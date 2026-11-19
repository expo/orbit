// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// TLV8 as used by Apple's pairing data components.
export const TLV = Object.freeze({
  METHOD: 0x00,
  IDENTIFIER: 0x01,
  SALT: 0x02,
  PUBLIC_KEY: 0x03,
  PROOF: 0x04,
  ENCRYPTED_DATA: 0x05,
  STATE: 0x06,
  ERROR: 0x07,
  RETRY_DELAY: 0x08,
  CERTIFICATE: 0x09,
  SIGNATURE: 0x0a,
  PERMISSIONS: 0x0b,
  FRAGMENT_DATA: 0x0c,
  FRAGMENT_LAST: 0x0d,
  SESSION_ID: 0x0e,
  TTL: 0x0f,
  EXTRA_DATA: 0x10,
  INFO: 0x11,
  ACL: 0x12,
  FLAGS: 0x13,
  VALIDATION_DATA: 0x14,
  MFI_AUTH_TOKEN: 0x15,
  MFI_PRODUCT_TYPE: 0x16,
  SERIAL_NUMBER: 0x17,
  MFI_AUTH_TOKEN_UUID: 0x18,
  APP_FLAGS: 0x19,
  OWNERSHIP_PROOF: 0x1a,
  SETUP_CODE_TYPE: 0x1b,
  PRODUCTION_DATA: 0x1c,
  APP_INFO: 0x1d,
  SEPARATOR: 0xff,
} as const);

export const TLV_ERROR = Object.freeze({
  UNKNOWN: 1,
  AUTHENTICATION: 2,
  BACKOFF: 3,
  MAX_PEERS: 4,
  MAX_TRIES: 5,
  UNAVAILABLE: 6,
  BUSY: 7,
} as const);

export type TlvValue = Buffer | Uint8Array | readonly number[];
export type TlvEntry = readonly [type: number, value: TlvValue];

/** Encode [[type, data], ...]; values longer than 255 bytes are split into consecutive entries. */
export function encodeTlv(entries: Iterable<TlvEntry>): Buffer {
  const chunks: Buffer[] = [];
  for (const [type, value] of entries) {
    const data = Buffer.isBuffer(value) ? value : Buffer.from(value as Uint8Array);
    if (data.length === 0) {
      chunks.push(Buffer.from([type, 0]));
      continue;
    }
    for (let offset = 0; offset < data.length; offset += 255) {
      const piece = data.subarray(offset, offset + 255);
      chunks.push(Buffer.from([type, piece.length]), piece);
    }
  }
  return Buffer.concat(chunks);
}

/** Decode into a Map(type -> Buffer), concatenating fragments of the same type. */
export function decodeTlv(buffer: Buffer): Map<number, Buffer> {
  const result = new Map<number, Buffer>();
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const type = buffer[offset];
    const length = buffer[offset + 1];
    const data = buffer.subarray(offset + 2, offset + 2 + length);
    if (data.length !== length) throw new Error('truncated TLV8');
    const existing = result.get(type);
    result.set(type, existing ? Buffer.concat([existing, data]) : Buffer.from(data));
    offset += 2 + length;
  }
  return result;
}
