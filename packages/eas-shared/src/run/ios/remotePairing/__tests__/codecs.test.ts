import crypto from 'crypto';

import { Ed25519, X25519, chachaOpen, chachaSeal, hkdf512, siphash24 } from '../crypto';
import { decodeOpack, encodeOpack } from '../opack';
import { PlistUid, parsePlist, toBinaryPlist, toXmlPlist } from '../plist';
import { N, SrpClient, SrpServer, bigIntToBytes, bytesToBigInt, g, modPow, pad } from '../srp';
import { TLV, decodeTlv, encodeTlv } from '../tlv8';
import {
  XPC_WRAPPER_MAGIC,
  XpcFileTransfer,
  XpcFlags,
  XpcUuid,
  decodeXpcWrapper,
  encodeXpcMessage,
  encodeXpcWrapper,
  uint64,
} from '../xpc';

describe('opack', () => {
  it('round-trips a nested object', () => {
    const value = {
      bool: true,
      no: false,
      small: 5,
      byte: 200,
      word: 70000,
      big: 2 ** 40,
      float: 1.5,
      double: 0.1,
      str: 'hello',
      longStr: 'x'.repeat(300),
      data: Buffer.from([1, 2, 3]),
      longData: Buffer.alloc(70000, 7),
      list: [1, 'two', Buffer.from('three')],
      longList: Array.from({ length: 20 }, (_, i) => i),
    };
    expect(decodeOpack(encodeOpack(value))).toEqual(value);
  });

  it('round-trips a large (terminated) dictionary', () => {
    const value: Record<string, number> = {};
    for (let i = 0; i < 20; i += 1) value[`k${i}`] = i;
    const encoded = encodeOpack(value);
    expect(encoded[0]).toBe(0xef);
    expect(decodeOpack(encoded)).toEqual(value);
  });

  it('encodes small ints and short strings compactly', () => {
    expect(encodeOpack(0)).toEqual(Buffer.from([0x08]));
    expect(encodeOpack('ab')).toEqual(Buffer.from([0x42, 0x61, 0x62]));
    expect(encodeOpack({})).toEqual(Buffer.from([0xe0]));
  });

  it('round-trips dates', () => {
    const date = new Date('2024-05-01T12:34:56.000Z');
    expect(decodeOpack(encodeOpack(date))).toEqual(date);
  });
});

describe('tlv8', () => {
  it('round-trips and fragments values longer than 255 bytes', () => {
    const big = crypto.randomBytes(600);
    const encoded = encodeTlv([
      [TLV.STATE, Buffer.from([1])],
      [TLV.PUBLIC_KEY, big],
      [TLV.SEPARATOR, Buffer.alloc(0)],
    ]);
    // 1 + 3 fragments (255 + 255 + 90) + empty separator
    expect(encoded.length).toBe(3 + (2 + 255) * 2 + (2 + 90) + 2);
    const decoded = decodeTlv(encoded);
    expect(decoded.get(TLV.STATE)).toEqual(Buffer.from([1]));
    expect(decoded.get(TLV.PUBLIC_KEY)).toEqual(big);
    expect(decoded.get(TLV.SEPARATOR)).toEqual(Buffer.alloc(0));
  });

  it('throws on truncated input', () => {
    expect(() => decodeTlv(Buffer.from([TLV.SALT, 4, 1, 2]))).toThrow('truncated TLV8');
  });
});

describe('plist', () => {
  const sample = {
    HostID: 'ABC-123',
    Escaped: 'a < b & c > d',
    Count: 42,
    Negative: -7,
    Huge: 2n ** 62n,
    Ratio: 2.5,
    Enabled: true,
    Disabled: false,
    Certificate: Buffer.from('-----BEGIN CERTIFICATE-----'),
    Created: new Date('2024-01-02T03:04:05Z'),
    List: ['a', 1, { nested: 'yes' }],
    EmptyList: [],
    EmptyDict: {},
  };

  it('round-trips XML', () => {
    const xml = toXmlPlist(sample);
    expect(xml).toContain('<!DOCTYPE plist');
    expect(xml).toContain('<string>a &lt; b &amp; c &gt; d</string>');
    expect(parsePlist(xml)).toEqual(sample);
    expect(parsePlist(Buffer.from(xml))).toEqual(sample);
  });

  it('round-trips binary', () => {
    const value = { ...sample, Unicode: 'héllo ✓', Uid: new PlistUid(3), Nothing: null };
    const binary = toBinaryPlist(value);
    expect(binary.subarray(0, 8).toString('latin1')).toBe('bplist00');
    expect(parsePlist(binary)).toEqual(value);
  });

  it('parses a binary plist produced by plutil', () => {
    // `plutil -convert binary1` of
    // { a: 1, b: [true, 'x', 'é', 1.5], d: <data 010203> }
    const binary = Buffer.from(
      '62706c6973743030d301020304050a5161516251641001a4060708090951786100e9233ff800000000000043' +
        '010203080f111315171c1d1f222b000000000000010100000000000000' +
        '0b0000000000000000000000000000002f',
      'hex'
    );
    expect(parsePlist(binary)).toEqual({
      a: 1,
      b: [true, 'x', 'é', 1.5],
      d: Buffer.from([1, 2, 3]),
    });
  });

  it('drops null/undefined entries when writing XML', () => {
    expect(parsePlist(toXmlPlist({ a: 1, b: null, c: undefined }))).toEqual({ a: 1 });
  });
});

describe('xpc', () => {
  it('round-trips a message', () => {
    const uuid = XpcUuid.random();
    const body = {
      str: 'hello',
      int: -5,
      big: 2n ** 60n,
      u: uint64(7),
      double: 1.25,
      yes: true,
      data: Buffer.from([9, 8, 7, 6, 5]),
      uuid,
      date: new Date(1700000000123),
      list: ['a', 1, { inner: 'x' }],
      empty: {},
      nothing: null,
    };
    const encoded = encodeXpcMessage(body, { messageId: 3, wantingReply: true });
    expect(encoded.readUInt32LE(0)).toBe(XPC_WRAPPER_MAGIC);
    const decoded = decodeXpcWrapper(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.length).toBe(encoded.length);
    expect(decoded!.messageId).toBe(3n);
    expect(decoded!.flags).toBe(
      XpcFlags.ALWAYS_SET | XpcFlags.DATA_PRESENT | XpcFlags.WANTING_REPLY
    );
    expect(decoded!.payload).toEqual({ ...body, u: 7 });
    expect(String((decoded!.payload as { uuid: XpcUuid }).uuid)).toBe(uuid.toString());
  });

  it('handles empty wrappers and partial buffers', () => {
    const encoded = encodeXpcWrapper({ flags: XpcFlags.ALWAYS_SET, messageId: 0 });
    expect(encoded.length).toBe(24);
    expect(decodeXpcWrapper(encoded)).toEqual({
      flags: XpcFlags.ALWAYS_SET,
      messageId: 0n,
      payload: null,
      length: 24,
    });
    const full = encodeXpcMessage({ a: 'b' });
    expect(decodeXpcWrapper(full.subarray(0, full.length - 1))).toBeNull();
    expect(decodeXpcWrapper(full.subarray(0, 10))).toBeNull();
  });

  it('round-trips file transfers', () => {
    const encoded = encodeXpcWrapper({ payload: { f: new XpcFileTransfer(1234, 99) } });
    const payload = decodeXpcWrapper(encoded)!.payload as { f: XpcFileTransfer };
    expect(payload.f).toBeInstanceOf(XpcFileTransfer);
    expect(payload.f.size).toBe(1234n);
    expect(payload.f.transferId).toBe(99n);
  });
});

describe('srp', () => {
  it('agrees between client and server and verifies proofs', () => {
    const salt = crypto.randomBytes(16);
    const server = new SrpServer({ password: '123456', salt });
    const client = new SrpClient({ password: '123456' });
    const serverKey = server.process(client.publicKey);
    const clientKey = client.process(server.publicKey, salt);
    expect(clientKey).toEqual(serverKey);
    expect(clientKey.length).toBe(64);
    expect(server.verifyClientProof(client.M1)).toBe(true);
    expect(client.verifyServerProof(server.M2)).toBe(true);
  });

  it('rejects a wrong password', () => {
    const salt = crypto.randomBytes(16);
    const server = new SrpServer({ password: '123456', salt });
    const client = new SrpClient({ password: '000000' });
    server.process(client.publicKey);
    client.process(server.publicKey, salt);
    expect(server.verifyClientProof(client.M1)).toBe(false);
  });

  it('matches manual SRP-6a math (S = g^(b(a + ux)))', () => {
    const salt = Buffer.alloc(16, 1);
    const a = 12345678901234567890n;
    const b = 98765432109876543210n;
    const server = new SrpServer({ password: 'pin', salt, privateKey: b });
    const client = new SrpClient({ password: 'pin', privateKey: a });
    const K = server.process(client.publicKey);
    expect(client.process(server.publicKey, salt)).toEqual(K);

    const sha = (...parts: Buffer[]): Buffer => {
      const h = crypto.createHash('sha512');
      parts.forEach((p) => h.update(p));
      return h.digest();
    };
    const x = bytesToBigInt(sha(salt, sha(Buffer.from('Pair-Setup:pin'))));
    const A = modPow(g, a, N);
    const u = bytesToBigInt(sha(pad(A), pad(server.B)));
    const S = modPow(g, (b * (a + u * x)) % (N - 1n), N);
    expect(K).toEqual(sha(bigIntToBytes(S)));
  });
});

describe('crypto', () => {
  it('seals and opens chacha20-poly1305', () => {
    const key = crypto.randomBytes(32);
    const nonce = Buffer.concat([Buffer.alloc(4), Buffer.from('PV-Msg02')]);
    const sealed = chachaSeal(key, nonce, Buffer.from('secret'));
    expect(chachaOpen(key, nonce, sealed).toString()).toBe('secret');
    sealed[0] ^= 1;
    expect(() => chachaOpen(key, nonce, sealed)).toThrow();
  });

  it('signs/verifies ed25519 and agrees on x25519', () => {
    const ed = new Ed25519();
    const sig = ed.sign(Buffer.from('msg'));
    expect(Ed25519.verify(ed.publicKey, Buffer.from('msg'), sig)).toBe(true);
    expect(Ed25519.verify(ed.publicKey, Buffer.from('other'), sig)).toBe(false);
    const alice = new X25519();
    const bob = new X25519();
    expect(alice.exchange(bob.publicKey)).toEqual(bob.exchange(alice.publicKey));
    expect(hkdf512(Buffer.alloc(32), null, 'info').length).toBe(32);
  });

  it('computes SipHash-2-4 reference vector', () => {
    // From the SipHash paper: key 00..0f, message 00..0e -> 0xa129ca6149be45e5
    const key = Buffer.from(Array.from({ length: 16 }, (_, i) => i));
    const data = Buffer.from(Array.from({ length: 15 }, (_, i) => i));
    expect(siphash24(key, data)).toBe(0xa129ca6149be45e5n);
  });
});
