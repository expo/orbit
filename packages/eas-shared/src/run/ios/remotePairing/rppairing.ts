// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// RemotePairing ("RPPairing") wire protocol: framing, the pairable-host responder that accepts a
// device-initiated Pair-Setup, and the client that pair-verifies against an already-paired iPhone
// and opens an encrypted control channel.
import crypto from 'crypto';
import { EventEmitter } from 'events';
import type { Socket } from 'net';
import type { Duplex } from 'stream';

import { Ed25519, X25519, chachaOpen, chachaSeal, hkdf512 } from './crypto';
import { decodeOpack, encodeOpack } from './opack';
import { SrpServer } from './srp';
import { TLV, TLV_ERROR, decodeTlv, encodeTlv } from './tlv8';

export const RPPAIRING_MAGIC = Buffer.from('RPPairing', 'latin1');
export const WIRE_PROTOCOL_VERSION = 26;

export class PairingError extends Error {}
export class PairingRejectedError extends PairingError {}
export class PairVerifyFailedError extends PairingError {}

/**
 * A decoded RPPairing JSON body. The protocol is a deeply nested, Swift-enum-shaped JSON
 * document (`{ message: { plain: { _0: ... } } }`), so it is navigated dynamically.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RPPairingMessage = any;

/** `peerDeviceInfo` / handshake response returned by the iPhone. */
export interface HandshakeInfo {
  wireProtocolVersion?: number;
  peerDeviceInfo?: {
    identifier?: string;
    name?: string;
    model?: string;
    udid?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** What `acceptPairing` needs to know about this host. */
export interface PairingHostInfo {
  name: string;
  model: string;
  identifier: string;
  altIrk: Buffer;
  udid?: string;
}

/** The iPhone's identity as received in Pair-Setup M5. */
export interface PairingPeer {
  accountId: string;
  altIrk: Buffer;
  model: string;
  name: string;
  udid: string;
  identifier: string | undefined;
  publicKey: Buffer | undefined;
  signature: Buffer | undefined;
}

export interface PairingOutcome {
  peer: PairingPeer;
  ed25519: Ed25519;
  sessionKey: Buffer;
}

/** The subset of a pair record that `RemotePairingClient` needs. */
export interface ClientPairRecord {
  hostIdentifier: string;
  /** 32-byte Ed25519 seed. */
  privateKey: Buffer;
  /** The iPhone's long-term Ed25519 key from Pair-Setup. When set, Pair-Verify checks it. */
  peerPublicKey?: Buffer;
  peerIdentifier?: string;
}

/** Device info decoded from the OPACK `INFO` TLV in Pair-Setup M5. */
interface DeviceOpackInfo {
  accountID: string;
  altIRK?: Buffer;
  model: string;
  name: string;
  remotepairing_udid?: string;
}

interface Waiter {
  resolve: (value: RPPairingMessage) => void;
  reject: (error: Error) => void;
}

const nonce = (label: string): Buffer =>
  Buffer.concat([Buffer.alloc(4), Buffer.from(label, 'latin1')]);

/** Frame a JSON body as an RPPairing packet. */
export function framePacket(body: Buffer | RPPairingMessage): Buffer {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body), 'utf8');
  if (payload.length > 0xffff) throw new PairingError('RPPairing packet too large');
  const header = Buffer.alloc(RPPAIRING_MAGIC.length + 2);
  RPPAIRING_MAGIC.copy(header, 0);
  header.writeUInt16BE(payload.length, RPPAIRING_MAGIC.length);
  return Buffer.concat([header, payload]);
}

/**
 * Incremental packet reader over any stream-like emitter of Buffers (net.Socket, Duplex).
 * `next()` resolves with the parsed JSON body of the next RPPairing packet.
 */
export class PacketReader {
  stream: Duplex;
  buffer: Buffer;
  waiters: Waiter[];
  closed: Error | null;

  constructor(stream: Duplex) {
    this.stream = stream;
    this.buffer = Buffer.alloc(0);
    this.waiters = [];
    this.closed = null;
    stream.on('data', (chunk: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.drain();
    });
    const finish = (error?: Error) => {
      this.closed = error || new PairingError('connection closed');
      for (const waiter of this.waiters.splice(0)) waiter.reject(this.closed);
    };
    stream.on('end', () => finish());
    stream.on('close', () => finish());
    stream.on('error', (error: Error) => finish(error));
  }

  drain(): void {
    while (this.waiters.length && this.buffer.length >= RPPAIRING_MAGIC.length + 2) {
      if (!this.buffer.subarray(0, RPPAIRING_MAGIC.length).equals(RPPAIRING_MAGIC)) {
        const error = new PairingError('invalid RPPairing magic');
        for (const waiter of this.waiters.splice(0)) waiter.reject(error);
        this.stream.destroy(error);
        return;
      }
      const size = this.buffer.readUInt16BE(RPPAIRING_MAGIC.length);
      const total = RPPAIRING_MAGIC.length + 2 + size;
      if (this.buffer.length < total) return;
      const body = this.buffer.subarray(RPPAIRING_MAGIC.length + 2, total);
      this.buffer = this.buffer.subarray(total);
      const waiter = this.waiters.shift()!;
      try {
        waiter.resolve(JSON.parse(body.toString('utf8')));
      } catch (error) {
        waiter.reject(error as Error);
      }
    }
  }

  next(timeoutMs: number = 0): Promise<RPPairingMessage> {
    if (this.closed) return Promise.reject(this.closed);
    return new Promise((resolve, reject) => {
      let timer: NodeJS.Timeout | undefined;
      const waiter: Waiter = {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          const index = this.waiters.indexOf(waiter);
          if (index >= 0) this.waiters.splice(index, 1);
          reject(new PairingError(`timed out waiting for RPPairing packet (${timeoutMs}ms)`));
        }, timeoutMs);
      }
      this.waiters.push(waiter);
      this.drain();
    });
  }
}

function writeAll(stream: Duplex, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.write(data, (error) => (error ? reject(error) : resolve()));
  });
}

const b64 = (buffer: Buffer | Uint8Array): string => Buffer.from(buffer).toString('base64');
const unb64 = (text: string): Buffer => Buffer.from(text, 'base64');

const describe = (value: unknown): string => String(JSON.stringify(value)).slice(0, 200);

// ---------------------------------------------------------------------------------------------
// Pairable host (we are the accessory; the iPhone initiates Pair-Setup)
// ---------------------------------------------------------------------------------------------

export interface AcceptPairingOptions {
  /** Invoked with the 6-digit code the user must type on the iPhone. */
  onPin?: (pin: string) => unknown;
  timeoutMs?: number;
  ed25519?: Ed25519;
}

/**
 * Accept one device-initiated pairing on an already-connected socket.
 * `hostInfo`: { name, model, identifier, altIrk, udid? }.
 * `onPin(pin)` is invoked with the 6-digit code the user must type on the iPhone.
 * Resolves with { peer: { udid, name, model, accountId, altIrk }, ed25519: Ed25519, sessionKey }.
 */
export async function acceptPairing(
  socket: Duplex,
  hostInfo: PairingHostInfo,
  { onPin, timeoutMs = 120_000, ed25519 = new Ed25519() }: AcceptPairingOptions = {}
): Promise<PairingOutcome> {
  const reader = new PacketReader(socket);
  let sequence = 0;

  const sendPlain = async (value: RPPairingMessage) => {
    await writeAll(
      socket,
      framePacket({
        message: { plain: { _0: value } },
        originatedBy: 'device',
        sequenceNumber: sequence,
      })
    );
    sequence += 1;
  };
  const receivePlain = async (): Promise<RPPairingMessage> => {
    const envelope = await reader.next(timeoutMs);
    const plain = envelope?.message?.plain?._0;
    if (!plain) throw new PairingError(`unexpected message from device: ${describe(envelope)}`);
    return plain;
  };
  const sendPairingData = (data: Buffer) =>
    sendPlain({
      event: {
        _0: {
          pairingData: {
            _0: { data: b64(data), startNewSession: false, kind: 'setupManualPairing' },
          },
        },
      },
    });
  const receivePairingData = async (): Promise<Buffer> => {
    const plain = await receivePlain();
    const event = plain.event?._0 || {};
    if (event.pairingData) return unb64(event.pairingData._0.data);
    if (event.pairingRejectedWithError) {
      throw new PairingRejectedError(
        event.pairingRejectedWithError.wrappedError?.userInfo?.NSLocalizedDescription ||
          'pairing rejected by device'
      );
    }
    throw new PairingError(`unexpected pairing event: ${describe(plain)}`);
  };
  const expectState = (tlv: Map<number, Buffer>, state: number) => {
    const value = tlv.get(TLV.STATE);
    if (!value || value[0] !== state) {
      throw new PairingError(`unexpected pair-setup state ${value?.[0]} (expected ${state})`);
    }
  };
  const ensureNoError = (tlv: Map<number, Buffer>) => {
    if (tlv.has(TLV.ERROR)) {
      throw new PairingError(`device returned pairing error ${tlv.get(TLV.ERROR)![0]}`);
    }
  };

  // Handshake
  const request = await receivePlain();
  const handshake = request?.request?._0?.handshake?._0;
  if (!handshake) throw new PairingError('device did not start with a handshake');
  if (handshake.hostOptions?.attemptPairVerify) {
    throw new PairingError('device requested pair-verify; this listener only accepts new pairings');
  }
  await sendPlain({
    response: {
      forRequestIdentifier: 0,
      _1: {
        handshake: {
          _0: {
            wireProtocolVersion: WIRE_PROTOCOL_VERSION,
            minimumSupportedWireProtocolVersion: 8,
            deviceOptions: {
              allowsPairSetup: true,
              allowsPinlessPairing: false,
              allowsIncomingTunnelConnections: false,
              allowsUpgradeOfLockdownPairings: false,
              allowsSharingSensitiveInfo: false,
            },
            peerDeviceInfo: {
              udid: hostInfo.udid || '',
              deviceKVSIncludesSensitiveInfo: false,
              identifier: hostInfo.identifier,
              name: hostInfo.name,
              model: hostInfo.model,
            },
          },
        },
      },
    },
  });

  // M1
  const m1 = decodeTlv(await receivePairingData());
  expectState(m1, 1);

  // M2: salt + B
  const salt = crypto.randomBytes(16);
  salt[0] |= 0x80; // keep a stable 16-byte big-endian representation for every SRP dialect
  const pin = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  let srp: SrpServer;
  do {
    srp = new SrpServer({ password: pin, salt });
  } while (srp.publicKey.length !== 384);
  if (onPin) await onPin(pin);
  await sendPairingData(
    encodeTlv([
      [TLV.STATE, Buffer.from([2])],
      [TLV.SALT, salt],
      [TLV.PUBLIC_KEY, srp.publicKey],
    ])
  );

  // M3: A + client proof
  const m3 = decodeTlv(await receivePairingData());
  ensureNoError(m3);
  expectState(m3, 3);
  const clientPublic = m3.get(TLV.PUBLIC_KEY);
  const clientProof = m3.get(TLV.PROOF);
  if (!clientPublic || !clientProof) {
    throw new PairingError('pair-setup M3 missing public key or proof');
  }
  const sessionKey = srp.process(clientPublic);
  if (!srp.verifyClientProof(clientProof)) {
    await sendPairingData(
      encodeTlv([
        [TLV.STATE, Buffer.from([4])],
        [TLV.ERROR, Buffer.from([TLV_ERROR.AUTHENTICATION])],
      ])
    );
    throw new PairingError('SRP authentication failed (wrong PIN?)');
  }

  // M4: server proof
  await sendPairingData(
    encodeTlv([
      [TLV.STATE, Buffer.from([4])],
      [TLV.PROOF, srp.M2],
    ])
  );

  const setupKey = hkdf512(
    sessionKey,
    Buffer.from('Pair-Setup-Encrypt-Salt'),
    Buffer.from('Pair-Setup-Encrypt-Info')
  );

  // M5: device identity
  const m5 = decodeTlv(await receivePairingData());
  ensureNoError(m5);
  expectState(m5, 5);
  const deviceTlv = decodeTlv(
    chachaOpen(setupKey, nonce('PS-Msg05'), m5.get(TLV.ENCRYPTED_DATA) as Buffer)
  );
  const info = decodeOpack(deviceTlv.get(TLV.INFO) as Buffer) as unknown as DeviceOpackInfo;
  const peer: PairingPeer = {
    accountId: info.accountID,
    altIrk: Buffer.from(info.altIRK || Buffer.alloc(0)),
    model: info.model,
    name: info.name,
    udid: info.remotepairing_udid || '',
    identifier: deviceTlv.get(TLV.IDENTIFIER)?.toString('utf8'),
    publicKey: deviceTlv.get(TLV.PUBLIC_KEY),
    signature: deviceTlv.get(TLV.SIGNATURE),
  };
  if (peer.altIrk.length !== 16) throw new PairingError('invalid altIRK in device identity');
  if (peer.publicKey && peer.signature && peer.identifier) {
    const deviceX = hkdf512(
      sessionKey,
      Buffer.from('Pair-Setup-Controller-Sign-Salt'),
      Buffer.from('Pair-Setup-Controller-Sign-Info')
    );
    const signed = Buffer.concat([deviceX, Buffer.from(peer.identifier, 'utf8'), peer.publicKey]);
    if (!Ed25519.verify(peer.publicKey, signed, peer.signature)) {
      throw new PairingError('device identity signature did not verify');
    }
  }

  // M6: our identity
  const accessoryX = hkdf512(
    sessionKey,
    Buffer.from('Pair-Setup-Accessory-Sign-Salt'),
    Buffer.from('Pair-Setup-Accessory-Sign-Info')
  );
  const signature = ed25519.sign(
    Buffer.concat([accessoryX, Buffer.from(hostInfo.identifier, 'utf8'), ed25519.publicKey])
  );
  const ourInfo = encodeOpack({
    altIRK: hostInfo.altIrk,
    btAddr: '11:22:33:44:55:66',
    mac: Buffer.from('112233445566', 'hex'),
    remotepairing_serial_number: 'AAAAAAAAAAAA',
    accountID: hostInfo.identifier,
    remotepairing_udid: hostInfo.udid || '',
    model: hostInfo.model,
    name: hostInfo.name,
  });
  const m6Plain = encodeTlv([
    [TLV.IDENTIFIER, Buffer.from(hostInfo.identifier, 'utf8')],
    [TLV.PUBLIC_KEY, ed25519.publicKey],
    [TLV.SIGNATURE, signature],
    [TLV.INFO, ourInfo],
  ]);
  const m6 = chachaSeal(setupKey, nonce('PS-Msg06'), m6Plain);
  await sendPairingData(
    encodeTlv([
      [TLV.ENCRYPTED_DATA, m6],
      [TLV.STATE, Buffer.from([6])],
    ])
  );

  return { peer, ed25519, sessionKey };
}

// ---------------------------------------------------------------------------------------------
// Client (we connect to the iPhone's RemotePairing listener)
// ---------------------------------------------------------------------------------------------

/** Build the non-pairing handshake probe used only to detect a RemotePairing listener. */
export function probeFrame(): Buffer {
  return framePacket({
    sequenceNumber: 0,
    originatedBy: 'host',
    message: {
      plain: {
        _0: {
          request: {
            _0: {
              handshake: {
                _0: {
                  wireProtocolVersion: WIRE_PROTOCOL_VERSION,
                  correlationIdentifier: { value: crypto.randomBytes(3).toString('hex') },
                  hostOptions: { attemptPairVerify: false },
                },
              },
            },
          },
        },
      },
    },
  });
}

/** The `createListener` response: the TLS-PSK port the phone opened, plus extra fields. */
export interface CreateListenerResponse {
  port: number;
  [key: string]: unknown;
}

/**
 * Encrypted control channel to a paired iPhone.
 * `pairRecord`: { hostIdentifier, privateKey (32-byte ed25519 seed) }.
 *
 * Events: "close" (). Socket errors reject the pending read instead of being re-emitted: an
 * "error" event nobody listens to would take the process down.
 */
export class RemotePairingClient extends EventEmitter {
  socket: Socket;
  reader: PacketReader;
  pairRecord: ClientPairRecord;
  timeoutMs: number;
  sequence: number;
  encryptedSequence: number;
  handshakeInfo: HandshakeInfo | null;
  encryptionKey: Buffer | null;
  clientKey: Buffer | null;
  serverKey: Buffer | null;
  queue: Promise<unknown>;

  constructor(
    socket: Socket,
    pairRecord: ClientPairRecord,
    { timeoutMs = 10_000 }: { timeoutMs?: number } = {}
  ) {
    super();
    this.socket = socket;
    this.reader = new PacketReader(socket);
    this.pairRecord = pairRecord;
    this.timeoutMs = timeoutMs;
    this.sequence = 0;
    this.encryptedSequence = 0;
    this.handshakeInfo = null;
    this.encryptionKey = null;
    this.clientKey = null;
    this.serverKey = null;
    this.queue = Promise.resolve();
    socket.on('close', () => this.emit('close'));
  }

  get remoteIdentifier(): string | undefined {
    return this.handshakeInfo?.peerDeviceInfo?.identifier;
  }

  get usable(): boolean {
    return !this.socket.destroyed && this.socket.writable && !this.reader.closed;
  }

  async sendRaw(envelope: RPPairingMessage): Promise<void> {
    await writeAll(this.socket, framePacket(envelope));
  }

  async sendPlain(value: RPPairingMessage): Promise<void> {
    await this.sendRaw({
      message: { plain: { _0: value } },
      originatedBy: 'host',
      sequenceNumber: this.sequence,
    });
    this.sequence += 1;
  }

  async receivePlain(): Promise<RPPairingMessage> {
    const envelope = await this.reader.next(this.timeoutMs);
    const plain = envelope?.message?.plain?._0;
    if (!plain) throw new PairingError(`unexpected message: ${describe(envelope)}`);
    return plain;
  }

  async handshake(): Promise<HandshakeInfo> {
    await this.sendPlain({
      request: {
        _0: {
          handshake: {
            _0: {
              wireProtocolVersion: WIRE_PROTOCOL_VERSION,
              correlationIdentifier: { value: crypto.randomBytes(3).toString('hex') },
              hostOptions: { attemptPairVerify: true },
            },
          },
        },
      },
    });
    const response = await this.receivePlain();
    this.handshakeInfo = response?.response?._1?.handshake?._0 ?? null;
    if (!this.handshakeInfo) throw new PairingError('handshake response missing');
    return this.handshakeInfo;
  }

  async sendPairingData(data: Buffer, kind: string, startNewSession: boolean): Promise<void> {
    await this.sendPlain({
      event: { _0: { pairingData: { _0: { data: b64(data), kind, startNewSession } } } },
    });
  }

  async receivePairingData(): Promise<Buffer> {
    const plain = await this.receivePlain();
    const event = plain.event?._0 || {};
    if (event.pairingData) return unb64(event.pairingData._0.data);
    if (event.pairingRejectedWithError) {
      throw new PairingRejectedError(
        event.pairingRejectedWithError.wrappedError?.userInfo?.NSLocalizedDescription ||
          'pairing rejected'
      );
    }
    throw new PairingError(`unexpected pairing event: ${describe(plain)}`);
  }

  /** Pair-Verify with the saved record. Throws PairVerifyFailedError if the phone rejects us. */
  async pairVerify(): Promise<true> {
    const x25519 = new X25519();
    const m1 = encodeTlv([
      [TLV.STATE, Buffer.from([1])],
      [TLV.PUBLIC_KEY, x25519.publicKey],
    ]);
    await this.sendPairingData(m1, 'verifyManualPairing', true);
    const m2 = decodeTlv(await this.receivePairingData());
    if (m2.has(TLV.ERROR)) {
      await this.sendPlain({ event: { _0: { pairVerifyFailed: {} } } });
      throw new PairVerifyFailedError('device rejected pair-verify (M2)');
    }
    const peerPublic = m2.get(TLV.PUBLIC_KEY);
    if (!peerPublic || peerPublic.length !== 32) {
      throw new PairingError('pair-verify M2 missing public key');
    }
    const encryptionKey = x25519.exchange(peerPublic);
    this.encryptionKey = encryptionKey;
    const verifyKey = hkdf512(
      encryptionKey,
      Buffer.from('Pair-Verify-Encrypt-Salt'),
      Buffer.from('Pair-Verify-Encrypt-Info')
    );
    if (this.pairRecord.peerPublicKey && !this.peerProvedIdentity(m2, verifyKey, x25519)) {
      // Not PairVerifyFailedError: the phone did not reject us, somebody else answered for it.
      throw new PairingError('the device did not prove it is the paired iPhone (pair-verify M2)');
    }

    const identifier = this.pairRecord.hostIdentifier;
    const signer = new Ed25519(this.pairRecord.privateKey);
    const signature = signer.sign(
      Buffer.concat([x25519.publicKey, Buffer.from(identifier, 'utf8'), peerPublic])
    );
    const m3Plain = encodeTlv([
      [TLV.IDENTIFIER, Buffer.from(identifier, 'utf8')],
      [TLV.SIGNATURE, signature],
    ]);
    const m3 = encodeTlv([
      [TLV.STATE, Buffer.from([3])],
      [TLV.ENCRYPTED_DATA, chachaSeal(verifyKey, nonce('PV-Msg03'), m3Plain)],
    ]);
    await this.sendPairingData(m3, 'verifyManualPairing', false);
    const m4 = decodeTlv(await this.receivePairingData());
    if (m4.has(TLV.ERROR)) {
      await this.sendPlain({ event: { _0: { pairVerifyFailed: {} } } });
      throw new PairVerifyFailedError('device rejected pair-verify (M4)');
    }
    this.clientKey = hkdf512(encryptionKey, null, Buffer.from('ClientEncrypt-main'));
    this.serverKey = hkdf512(encryptionKey, null, Buffer.from('ServerEncrypt-main'));
    return true;
  }

  /**
   * Pair-Verify M2 as in HAP: the device signs (its curve key | its pairing id | our curve key)
   * with the long-term key it sent in Pair-Setup, sealed under the verify key. Without this
   * check any listener that accepts our M3 would become the tunnel peer.
   */
  private peerProvedIdentity(m2: Map<number, Buffer>, verifyKey: Buffer, x25519: X25519): boolean {
    const { peerPublicKey, peerIdentifier } = this.pairRecord;
    try {
      const tlv = decodeTlv(
        chachaOpen(verifyKey, nonce('PV-Msg02'), m2.get(TLV.ENCRYPTED_DATA) as Buffer)
      );
      const identifier = tlv.get(TLV.IDENTIFIER);
      const signature = tlv.get(TLV.SIGNATURE);
      if (!identifier || !signature) return false;
      if (peerIdentifier && identifier.toString('utf8') !== peerIdentifier) return false;
      return Ed25519.verify(
        peerPublicKey!,
        Buffer.concat([m2.get(TLV.PUBLIC_KEY)!, identifier, x25519.publicKey]),
        signature
      );
    } catch {
      return false;
    }
  }

  /** handshake + pair-verify. */
  async connect(): Promise<HandshakeInfo> {
    await this.handshake();
    await this.pairVerify();
    return this.handshakeInfo!;
  }

  /** Send an encrypted request and return `response._1`. Requests are serialised. */
  request(body: RPPairingMessage): Promise<RPPairingMessage> {
    const run = async (): Promise<RPPairingMessage> => {
      if (!this.clientKey) throw new PairingError('not pair-verified');
      const nonceBuffer = Buffer.alloc(12);
      nonceBuffer.writeBigUInt64LE(BigInt(this.encryptedSequence));
      const sealed = chachaSeal(
        this.clientKey,
        nonceBuffer,
        Buffer.from(JSON.stringify(body), 'utf8')
      );
      await this.sendRaw({
        message: { streamEncrypted: { _0: b64(sealed) } },
        originatedBy: 'host',
        sequenceNumber: this.sequence,
      });
      this.sequence += 1;
      const envelope = await this.reader.next(this.timeoutMs);
      const encrypted = envelope?.message?.streamEncrypted?._0;
      if (!encrypted) {
        throw new PairingError(`expected encrypted response, got ${describe(envelope)}`);
      }
      const plaintext = chachaOpen(this.serverKey!, nonceBuffer, unb64(encrypted));
      this.encryptedSequence += 1;
      const response = JSON.parse(plaintext.toString('utf8'))?.response?._1;
      if (response?.errorExtended) {
        throw new PairingError(
          response.errorExtended._0?.userInfo?.NSLocalizedDescription || 'device returned an error'
        );
      }
      return response;
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => {});
    return result;
  }

  /** Ask the phone to open a TLS-PSK TCP listener for a CoreDevice tunnel. Returns { port, ... }. */
  async createTcpListener(): Promise<CreateListenerResponse> {
    const response = await this.request({
      request: {
        _0: {
          createListener: {
            key: b64(this.encryptionKey!),
            peerConnectionsInfo: [
              { owningPID: process.pid, owningProcessName: 'CoreDeviceService' },
            ],
            transportProtocolType: 'tcp',
          },
        },
      },
    });
    if (!response?.createListener) throw new PairingError('createListener response missing');
    return response.createListener;
  }

  close(): void {
    this.socket.destroy();
  }
}
