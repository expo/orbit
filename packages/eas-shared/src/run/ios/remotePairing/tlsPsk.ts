// TLS 1.2 client for one cipher suite: TLS_PSK_WITH_AES_128_GCM_SHA256 (RFC 5246, RFC 4279,
// RFC 5487, extended master secret from RFC 7627).
//
// Why not Node's `tls`: the iPhone only accepts the PSK suites with AES-GCM for the CoreDevice
// tunnel. Electron's Node runtime is built on BoringSSL, which has no PSK suite with AES-GCM, so
// `tls.connect` fails there with a handshake_failure alert. The menu bar app on Windows and Linux
// runs the CLI on that runtime. This client only needs HMAC-SHA256 and AES-128-GCM from `crypto`,
// which every runtime has.
import crypto from 'crypto';
import { Duplex } from 'stream';

export class TlsPskError extends Error {}

const TLS_1_2 = 0x0303;
const TLS_PSK_WITH_AES_128_GCM_SHA256 = 0x00a8;

const RECORD_CHANGE_CIPHER_SPEC = 20;
const RECORD_ALERT = 21;
const RECORD_HANDSHAKE = 22;
const RECORD_APPLICATION_DATA = 23;

const HANDSHAKE_HELLO_REQUEST = 0;
const HANDSHAKE_CLIENT_HELLO = 1;
const HANDSHAKE_SERVER_HELLO = 2;
const HANDSHAKE_SERVER_KEY_EXCHANGE = 12;
const HANDSHAKE_SERVER_HELLO_DONE = 14;
const HANDSHAKE_CLIENT_KEY_EXCHANGE = 16;
const HANDSHAKE_FINISHED = 20;

const EXTENSION_EXTENDED_MASTER_SECRET = 0x0017;
const EXTENSION_RENEGOTIATION_INFO = 0xff01;

const ALERT_LEVEL_WARNING = 1;
const ALERT_LEVEL_FATAL = 2;
const ALERT_CLOSE_NOTIFY = 0;
const ALERT_BAD_RECORD_MAC = 20;
const ALERT_HANDSHAKE_FAILURE = 40;
const ALERT_DECRYPT_ERROR = 51;

const MAX_PLAINTEXT = 16384;
/** Explicit nonce (8) + GCM tag (16), with the margin RFC 5246 allows for ciphertext. */
const MAX_CIPHERTEXT = MAX_PLAINTEXT + 2048;
const KEY_LENGTH = 16;
const SALT_LENGTH = 4;
const EXPLICIT_NONCE_LENGTH = 8;
const TAG_LENGTH = 16;
const VERIFY_DATA_LENGTH = 12;

function hmac(secret: Buffer, data: Buffer): Buffer {
  return crypto.createHmac('sha256', secret).update(data).digest();
}

/** The TLS 1.2 PRF with SHA-256 (RFC 5246, section 5). */
export function prf(secret: Buffer, label: string, seed: Buffer, length: number): Buffer {
  const labelAndSeed = Buffer.concat([Buffer.from(label, 'ascii'), seed]);
  const blocks: Buffer[] = [];
  let a: Buffer = labelAndSeed;
  for (let size = 0; size < length; size += 32) {
    a = hmac(secret, a);
    blocks.push(hmac(secret, Buffer.concat([a, labelAndSeed])));
  }
  return Buffer.concat(blocks).subarray(0, length);
}

function uint16(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value);
  return buffer;
}

function handshakeMessage(type: number, body: Buffer): Buffer {
  const header = Buffer.alloc(4);
  header.writeUInt8(type);
  header.writeUIntBE(body.length, 1, 3);
  return Buffer.concat([header, body]);
}

/** One direction of the record protection: AES-128-GCM with the nonce from RFC 5288. */
class RecordCipher {
  private sequence = 0n;

  constructor(
    private readonly key: Buffer,
    private readonly salt: Buffer
  ) {}

  private additionalData(type: number, length: number): Buffer {
    const data = Buffer.alloc(13);
    data.writeBigUInt64BE(this.sequence);
    data.writeUInt8(type, 8);
    data.writeUInt16BE(TLS_1_2, 9);
    data.writeUInt16BE(length, 11);
    return data;
  }

  encrypt(type: number, plaintext: Buffer): Buffer {
    const explicitNonce = Buffer.alloc(EXPLICIT_NONCE_LENGTH);
    explicitNonce.writeBigUInt64BE(this.sequence);
    const cipher = crypto.createCipheriv(
      'aes-128-gcm',
      this.key,
      Buffer.concat([this.salt, explicitNonce])
    );
    cipher.setAAD(this.additionalData(type, plaintext.length));
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    this.sequence += 1n;
    return Buffer.concat([explicitNonce, ciphertext, cipher.getAuthTag()]);
  }

  decrypt(type: number, fragment: Buffer): Buffer {
    if (fragment.length < EXPLICIT_NONCE_LENGTH + TAG_LENGTH) {
      throw new TlsPskError('TLS record is too short');
    }
    const explicitNonce = fragment.subarray(0, EXPLICIT_NONCE_LENGTH);
    const ciphertext = fragment.subarray(EXPLICIT_NONCE_LENGTH, fragment.length - TAG_LENGTH);
    const decipher = crypto.createDecipheriv(
      'aes-128-gcm',
      this.key,
      Buffer.concat([this.salt, explicitNonce])
    );
    decipher.setAAD(this.additionalData(type, ciphertext.length));
    decipher.setAuthTag(fragment.subarray(fragment.length - TAG_LENGTH));
    try {
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      this.sequence += 1n;
      return plaintext;
    } catch {
      throw new TlsPskError('TLS record failed authentication');
    }
  }
}

type HandshakeState =
  | 'server-hello'
  | 'server-hello-done'
  | 'change-cipher-spec'
  | 'finished'
  | 'established';

/**
 * A TLS-PSK client on top of a connected stream. It starts the handshake when created, emits
 * "secureConnect" when the handshake completes, and is then a Duplex of application data.
 * A write before that waits for the handshake.
 */
export class TlsPskSocket extends Duplex {
  private state: HandshakeState = 'server-hello';
  private inbound: Buffer = Buffer.alloc(0);
  private handshakeBuffer: Buffer = Buffer.alloc(0);
  private transcript: Buffer[] = [];
  private readonly clientRandom = crypto.randomBytes(32);
  private serverRandom: Buffer = Buffer.alloc(0);
  private useExtendedMasterSecret = false;
  private masterSecret: Buffer = Buffer.alloc(0);
  private readCipher: RecordCipher | null = null;
  private writeCipher: RecordCipher | null = null;
  private pendingReadCipher: RecordCipher | null = null;
  private pendingWrites: (() => void)[] = [];
  private transportEnded = false;

  constructor(
    private readonly transport: Duplex,
    private readonly psk: Buffer,
    private readonly identity: Buffer = Buffer.alloc(0)
  ) {
    super();
    transport.on('data', this.onTransportData);
    transport.on('error', this.onTransportError);
    transport.on('end', this.onTransportEnd);
    transport.on('close', this.onTransportClose);
    this.sendClientHello();
  }

  // --- Transport ---

  private onTransportData = (chunk: Buffer): void => {
    this.inbound = this.inbound.length ? Buffer.concat([this.inbound, chunk]) : chunk;
    try {
      while (!this.destroyed && this.inbound.length >= 5) {
        const type = this.inbound.readUInt8(0);
        const length = this.inbound.readUInt16BE(3);
        if (length > MAX_CIPHERTEXT) throw new TlsPskError('TLS record is too long');
        if (this.inbound.length < 5 + length) break;
        const fragment = this.inbound.subarray(5, 5 + length);
        this.inbound = this.inbound.subarray(5 + length);
        this.handleRecord(
          type,
          this.readCipher ? this.readCipher.decrypt(type, fragment) : fragment
        );
      }
    } catch (error) {
      this.fail(error as Error);
    }
  };

  private onTransportError = (error: Error): void => {
    this.destroy(error);
  };

  private onTransportEnd = (): void => {
    this.endOfData();
  };

  private onTransportClose = (): void => {
    if (this.state !== 'established') {
      this.destroy(new TlsPskError('The connection closed during the TLS handshake'));
      return;
    }
    this.endOfData();
    this.destroy();
  };

  private endOfData(): void {
    if (this.transportEnded) return;
    this.transportEnded = true;
    if (this.state === 'established') this.push(null);
  }

  private writeRecord(type: number, payload: Buffer, callback?: (error?: Error | null) => void) {
    const records: Buffer[] = [];
    for (let offset = 0; offset === 0 || offset < payload.length; offset += MAX_PLAINTEXT) {
      const plaintext = payload.subarray(offset, offset + MAX_PLAINTEXT);
      const fragment = this.writeCipher ? this.writeCipher.encrypt(type, plaintext) : plaintext;
      const header = Buffer.alloc(5);
      header.writeUInt8(type);
      header.writeUInt16BE(TLS_1_2, 1);
      header.writeUInt16BE(fragment.length, 3);
      records.push(header, fragment);
    }
    this.transport.write(Buffer.concat(records), callback);
  }

  /** Tell the peer why, when possible, then fail the stream. */
  private fail(error: Error): void {
    if (this.destroyed) return;
    const description =
      error.message === 'TLS record failed authentication'
        ? ALERT_BAD_RECORD_MAC
        : this.state === 'finished'
          ? ALERT_DECRYPT_ERROR
          : ALERT_HANDSHAKE_FAILURE;
    try {
      this.writeRecord(RECORD_ALERT, Buffer.from([ALERT_LEVEL_FATAL, description]));
    } catch {
      // The transport is already closed.
    }
    this.destroy(error);
  }

  // --- Records ---

  private handleRecord(type: number, payload: Buffer): void {
    if (type === RECORD_ALERT) {
      this.handleAlert(payload);
    } else if (type === RECORD_HANDSHAKE) {
      this.handshakeBuffer = Buffer.concat([this.handshakeBuffer, payload]);
      while (!this.destroyed && this.handshakeBuffer.length >= 4) {
        const length = this.handshakeBuffer.readUIntBE(1, 3);
        if (this.handshakeBuffer.length < 4 + length) break;
        const message = this.handshakeBuffer.subarray(0, 4 + length);
        this.handshakeBuffer = this.handshakeBuffer.subarray(4 + length);
        this.handleHandshake(message.readUInt8(0), message.subarray(4), message);
      }
    } else if (type === RECORD_CHANGE_CIPHER_SPEC) {
      if (this.state !== 'change-cipher-spec' || this.handshakeBuffer.length) {
        throw new TlsPskError('Unexpected TLS ChangeCipherSpec');
      }
      this.readCipher = this.pendingReadCipher;
      this.state = 'finished';
    } else if (type === RECORD_APPLICATION_DATA) {
      if (this.state !== 'established') {
        throw new TlsPskError('TLS application data before the handshake completed');
      }
      if (payload.length && !this.push(payload)) this.transport.pause();
    } else {
      throw new TlsPskError(`Unexpected TLS record type ${type}`);
    }
  }

  private handleAlert(payload: Buffer): void {
    const level = payload[0];
    const description = payload[1];
    if (description === ALERT_CLOSE_NOTIFY) {
      if (this.state !== 'established') {
        throw new TlsPskError('The peer closed the connection during the TLS handshake');
      }
      this.endOfData();
      this.transport.end();
    } else if (level !== ALERT_LEVEL_WARNING) {
      this.destroy(new TlsPskError(`TLS alert ${description} from the peer`));
    }
  }

  // --- Handshake ---

  private sendHandshake(type: number, body: Buffer): void {
    const message = handshakeMessage(type, body);
    this.transcript.push(message);
    this.writeRecord(RECORD_HANDSHAKE, message);
  }

  private transcriptHash(): Buffer {
    return crypto.createHash('sha256').update(Buffer.concat(this.transcript)).digest();
  }

  private sendClientHello(): void {
    const extensions = Buffer.concat([
      uint16(EXTENSION_EXTENDED_MASTER_SECRET),
      uint16(0),
      // An empty renegotiated_connection: this is the first handshake of the connection.
      uint16(EXTENSION_RENEGOTIATION_INFO),
      uint16(1),
      Buffer.from([0]),
    ]);
    this.sendHandshake(
      HANDSHAKE_CLIENT_HELLO,
      Buffer.concat([
        uint16(TLS_1_2),
        this.clientRandom,
        Buffer.from([0]), // No session to resume.
        uint16(2),
        uint16(TLS_PSK_WITH_AES_128_GCM_SHA256),
        Buffer.from([1, 0]), // One compression method: null.
        uint16(extensions.length),
        extensions,
      ])
    );
  }

  private handleHandshake(type: number, body: Buffer, message: Buffer): void {
    if (type === HANDSHAKE_HELLO_REQUEST) {
      // A request to renegotiate. It is not part of the transcript, and this client does not
      // renegotiate.
      return;
    }
    if (type === HANDSHAKE_SERVER_HELLO && this.state === 'server-hello') {
      this.transcript.push(message);
      this.handleServerHello(body);
      this.state = 'server-hello-done';
    } else if (type === HANDSHAKE_SERVER_KEY_EXCHANGE && this.state === 'server-hello-done') {
      // Only carries the PSK identity hint. There is one PSK, so the hint is not used.
      this.transcript.push(message);
    } else if (type === HANDSHAKE_SERVER_HELLO_DONE && this.state === 'server-hello-done') {
      this.transcript.push(message);
      this.sendClientKeyExchangeAndFinished();
      this.state = 'change-cipher-spec';
    } else if (type === HANDSHAKE_FINISHED && this.state === 'finished') {
      const expected = prf(
        this.masterSecret,
        'server finished',
        this.transcriptHash(),
        VERIFY_DATA_LENGTH
      );
      if (body.length !== expected.length || !crypto.timingSafeEqual(body, expected)) {
        throw new TlsPskError('The TLS server Finished message is not valid');
      }
      this.state = 'established';
      this.emit('secureConnect');
      for (const write of this.pendingWrites.splice(0)) write();
      if (this.transportEnded) this.push(null);
    } else {
      throw new TlsPskError(`Unexpected TLS handshake message ${type}`);
    }
  }

  private handleServerHello(body: Buffer): void {
    if (body.length < 38) throw new TlsPskError('TLS ServerHello is too short');
    const version = body.readUInt16BE(0);
    this.serverRandom = Buffer.from(body.subarray(2, 34));
    let offset = 34;
    offset += 1 + body.readUInt8(offset); // Session id.
    const cipherSuite = body.readUInt16BE(offset);
    const compression = body.readUInt8(offset + 2);
    offset += 3;
    if (
      version !== TLS_1_2 ||
      cipherSuite !== TLS_PSK_WITH_AES_128_GCM_SHA256 ||
      compression !== 0
    ) {
      throw new TlsPskError('The TLS server chose parameters that this client did not offer');
    }
    if (offset + 2 > body.length) return;
    const end = offset + 2 + body.readUInt16BE(offset);
    offset += 2;
    while (offset + 4 <= end) {
      const extension = body.readUInt16BE(offset);
      if (extension === EXTENSION_EXTENDED_MASTER_SECRET) this.useExtendedMasterSecret = true;
      offset += 4 + body.readUInt16BE(offset + 2);
    }
  }

  private sendClientKeyExchangeAndFinished(): void {
    this.sendHandshake(
      HANDSHAKE_CLIENT_KEY_EXCHANGE,
      Buffer.concat([uint16(this.identity.length), this.identity])
    );

    // RFC 4279, section 2: the "other secret" of plain PSK is as many zero bytes as the PSK.
    const premasterSecret = Buffer.concat([
      uint16(this.psk.length),
      Buffer.alloc(this.psk.length),
      uint16(this.psk.length),
      this.psk,
    ]);
    this.masterSecret = this.useExtendedMasterSecret
      ? prf(premasterSecret, 'extended master secret', this.transcriptHash(), 48)
      : prf(
          premasterSecret,
          'master secret',
          Buffer.concat([this.clientRandom, this.serverRandom]),
          48
        );
    const keys = prf(
      this.masterSecret,
      'key expansion',
      Buffer.concat([this.serverRandom, this.clientRandom]),
      2 * KEY_LENGTH + 2 * SALT_LENGTH
    );
    const clientKey = keys.subarray(0, KEY_LENGTH);
    const serverKey = keys.subarray(KEY_LENGTH, 2 * KEY_LENGTH);
    const clientSalt = keys.subarray(2 * KEY_LENGTH, 2 * KEY_LENGTH + SALT_LENGTH);
    const serverSalt = keys.subarray(2 * KEY_LENGTH + SALT_LENGTH);
    this.pendingReadCipher = new RecordCipher(serverKey, serverSalt);

    this.writeRecord(RECORD_CHANGE_CIPHER_SPEC, Buffer.from([1]));
    this.writeCipher = new RecordCipher(clientKey, clientSalt);
    this.sendHandshake(
      HANDSHAKE_FINISHED,
      prf(this.masterSecret, 'client finished', this.transcriptHash(), VERIFY_DATA_LENGTH)
    );
  }

  // --- Duplex ---

  override _read(): void {
    this.transport.resume();
  }

  override _write(
    chunk: Buffer,
    _encoding: string,
    callback: (error?: Error | null) => void
  ): void {
    const write = (): void => this.writeRecord(RECORD_APPLICATION_DATA, chunk, callback);
    if (this.state === 'established') {
      write();
    } else {
      this.pendingWrites.push(write);
    }
  }

  override _final(callback: (error?: Error | null) => void): void {
    if (this.state === 'established' && !this.transport.destroyed) {
      this.writeRecord(RECORD_ALERT, Buffer.from([ALERT_LEVEL_WARNING, ALERT_CLOSE_NOTIFY]));
      this.transport.end();
    }
    callback();
  }

  override _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
    this.transport.removeListener('data', this.onTransportData);
    this.transport.removeListener('end', this.onTransportEnd);
    this.transport.removeListener('close', this.onTransportClose);
    this.transport.destroy();
    callback(error);
  }
}
