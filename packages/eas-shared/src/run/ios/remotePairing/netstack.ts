// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// A small userspace IPv6 network stack: TCP (active + passive open) over a raw packet link.
// The CoreDevice tunnel carries raw IPv6 packets, and running our own stack means no root,
// no kernel utun, and no native dependency. Connections are exposed as stream.Duplex objects.
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { Duplex } from 'stream';

const PROTO_TCP = 6;
const PROTO_ICMPV6 = 58;
const IPV6_HEADER = 40;
const TCP_HEADER = 20;

const FIN = 0x01;
const SYN = 0x02;
const RST = 0x04;
const PSH = 0x08;
const ACK = 0x10;
const MOD = 0x100000000;
const seqLt = (a: number, b: number): boolean => ((a - b) | 0) < 0; // a < b in sequence space
const seqLe = (a: number, b: number): boolean => ((a - b) | 0) <= 0;
const add = (a: number, b: number): number => (a + b) % MOD;

const RECEIVE_WINDOW = 256 * 1024;
const SEND_BUFFER_LIMIT = 512 * 1024;
const RTO_INITIAL = 1000;
const RTO_MAX = 8000;
const MAX_RETRANSMITS = 8;

export function ipToBytes(address: string): Buffer {
  if (address.includes(':')) {
    const clean = address.split('%')[0];
    const halves = clean.split('::');
    const head = halves[0] ? halves[0].split(':') : [];
    const tail = halves.length > 1 && halves[1] ? halves[1].split(':') : [];
    const groups = [...head, ...Array<string>(8 - head.length - tail.length).fill('0'), ...tail];
    const bytes = Buffer.alloc(16);
    groups.forEach((group, index) => bytes.writeUInt16BE(parseInt(group || '0', 16), index * 2));
    return bytes;
  }
  return Buffer.from(address.split('.').map(Number));
}

export function bytesToIp(bytes: Buffer): string {
  if (bytes.length === 4) return [...bytes].join('.');
  const groups: string[] = [];
  for (let i = 0; i < 16; i += 2) groups.push(bytes.readUInt16BE(i).toString(16));
  const text = groups.join(':');
  // Compress the longest run of zero groups.
  const runs = text.match(/(^|:)(0(:0)+)(:|$)/g);
  if (!runs) return text;
  const longest = runs.sort((a, b) => b.length - a.length)[0];
  return text.replace(longest, '::').replace(/:::/, '::');
}

export interface ParsedIpv6 {
  proto: number;
  src: Buffer;
  dst: Buffer;
  payload: Buffer;
}

export interface NetStackOptions {
  /** Our tunnel address. */
  localAddress: string;
  mtu?: number;
}

export interface ConnectOptions {
  timeoutMs?: number;
}

export type ConnectionHandler = (connection: TcpConnection) => void;

interface InFlightSegment {
  seq: number;
  length: number;
  data: Buffer;
  flags: number;
  sentAt: number;
  retries: number;
}

interface ConnectCallbacks {
  resolve: (connection: TcpConnection) => void;
  reject: (error: Error) => void;
}

interface OutOfOrderSegment {
  data: Buffer;
  fin: number;
}

type TcpState =
  | 'CLOSED'
  | 'SYN_SENT'
  | 'SYN_RECEIVED'
  | 'ESTABLISHED'
  | 'FIN_WAIT_1'
  | 'FIN_WAIT_2'
  | 'CLOSE_WAIT'
  | 'LAST_ACK'
  | 'TIME_WAIT';

function checksum(pseudo: Buffer, payload: Buffer): number {
  let sum = 0;
  const feed = (buffer: Buffer): void => {
    for (let i = 0; i + 1 < buffer.length; i += 2) sum += buffer.readUInt16BE(i);
    if (buffer.length % 2) sum += buffer[buffer.length - 1] << 8;
  };
  feed(pseudo);
  feed(payload);
  while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);
  return ~sum & 0xffff;
}

function pseudoHeader(src: Buffer, dst: Buffer, length: number, proto: number): Buffer {
  const buffer = Buffer.alloc(40);
  src.copy(buffer, 0);
  dst.copy(buffer, 16);
  buffer.writeUInt32BE(length, 32);
  buffer[39] = proto;
  return buffer;
}

export function buildIpv6(
  src: Buffer,
  dst: Buffer,
  proto: number,
  payload: Buffer,
  hopLimit = 64
): Buffer {
  const header = Buffer.alloc(IPV6_HEADER);
  header.writeUInt32BE(0x60000000, 0);
  header.writeUInt16BE(payload.length, 4);
  header[6] = proto;
  header[7] = hopLimit;
  src.copy(header, 8);
  dst.copy(header, 24);
  return Buffer.concat([header, payload]);
}

export function parseIpv6(packet: Buffer): ParsedIpv6 | null {
  if (packet.length < IPV6_HEADER || packet[0] >> 4 !== 6) return null;
  const payloadLength = packet.readUInt16BE(4);
  return {
    proto: packet[6],
    src: packet.subarray(8, 24),
    dst: packet.subarray(24, 40),
    payload: packet.subarray(IPV6_HEADER, IPV6_HEADER + payloadLength),
  };
}

/**
 * One TCP connection, usable like a `net.Socket` by stream consumers (`write`, `on('data')`,
 * `end`, `destroy`, `setNoDelay`, `remoteAddress`, `remotePort`).
 */
export class TcpConnection extends Duplex {
  readonly stack: NetStack;
  readonly local: Buffer;
  readonly remote: Buffer;
  readonly localPort: number;
  readonly remotePort: number;
  readonly key: string;
  state: TcpState;
  mss: number;
  sendNext: number; // next sequence number to send
  sendUnacked: number; // oldest unacknowledged
  sendQueue: Buffer[]; // Buffers waiting to be segmented
  sendQueueBytes: number;
  inFlight: InFlightSegment[];
  peerWindow: number;
  receiveNext: number;
  receiveBuffered: number;
  outOfOrder: Map<number, OutOfOrderSegment>;
  readWanted: boolean;
  finQueued: boolean;
  finSent: boolean;
  finReceived: boolean;
  pendingWriteCallbacks: ((error?: Error | null) => void)[];
  rto: number;
  retransmitTimer: NodeJS.Timeout | null;
  timeWaitTimer?: NodeJS.Timeout;
  connectCallbacks: ConnectCallbacks | null;
  finCallback?: ((error?: Error | null) => void) | null;
  onAccept?: ConnectionHandler;
  readonly remoteAddress: string;
  readonly remotePortNumber: number;

  constructor(
    stack: NetStack,
    {
      local,
      remote,
      localPort,
      remotePort,
    }: { local: Buffer; remote: Buffer; localPort: number; remotePort: number }
  ) {
    super({ allowHalfOpen: true });
    this.stack = stack;
    this.local = local;
    this.remote = remote;
    this.localPort = localPort;
    this.remotePort = remotePort;
    this.key = TcpConnection.keyFor(remote, remotePort, localPort);
    this.state = 'CLOSED';
    this.mss = stack.mtu - IPV6_HEADER - TCP_HEADER;
    this.sendNext = crypto.randomInt(0, MOD);
    this.sendUnacked = this.sendNext;
    this.sendQueue = [];
    this.sendQueueBytes = 0;
    this.inFlight = [];
    this.peerWindow = 65535;
    this.receiveNext = 0;
    this.receiveBuffered = 0;
    this.outOfOrder = new Map();
    this.readWanted = true;
    this.finQueued = false;
    this.finSent = false;
    this.finReceived = false;
    this.pendingWriteCallbacks = [];
    this.rto = RTO_INITIAL;
    this.retransmitTimer = null;
    this.connectCallbacks = null;
    this.remoteAddress = bytesToIp(remote);
    this.remotePortNumber = remotePort;
  }

  static keyFor(remote: Buffer, remotePort: number, localPort: number): string {
    return `${remote.toString('hex')}:${remotePort}:${localPort}`;
  }

  // ---- net.Socket compatibility ----

  /** No-op: segments are sent as soon as the window allows (there is no Nagle delay). */
  setNoDelay(_noDelay?: boolean): this {
    return this;
  }

  /** No-op: liveness is tracked by the tunnel's own socket. */
  setKeepAlive(_enable?: boolean, _initialDelay?: number): this {
    return this;
  }

  // ---- Duplex plumbing ----

  override _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    if (this.state === 'CLOSED' || this.finQueued) {
      callback(new Error('socket is closed'));
      return;
    }
    this.sendQueue.push(Buffer.from(chunk));
    this.sendQueueBytes += chunk.length;
    if (this.sendQueueBytes + this.inFlightBytes() > SEND_BUFFER_LIMIT) {
      this.pendingWriteCallbacks.push(callback);
    } else {
      callback();
    }
    this.pump();
  }

  override _final(callback: (error?: Error | null) => void): void {
    this.finQueued = true;
    this.finCallback = callback;
    this.pump();
  }

  override _read(): void {
    this.readWanted = true;
    this.maybeWindowUpdate();
  }

  override _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
    if (this.state !== 'CLOSED' && this.state !== 'TIME_WAIT') {
      if (!this.finSent || error) {
        this.sendSegment(RST | ACK, Buffer.alloc(0), { noRetransmit: true });
      }
    }
    this.teardown();
    callback(error);
  }

  inFlightBytes(): number {
    return this.inFlight.reduce((total, segment) => total + segment.data.length, 0);
  }

  teardown(): void {
    if (this.retransmitTimer) clearTimeout(this.retransmitTimer);
    clearTimeout(this.timeWaitTimer);
    this.state = 'CLOSED';
    this.stack.connections.delete(this.key);
    const error = new Error('connection reset');
    for (const callback of this.pendingWriteCallbacks.splice(0)) callback(error);
    if (this.connectCallbacks) {
      this.connectCallbacks.reject(error);
      this.connectCallbacks = null;
    }
  }

  // ---- Sending ----

  sendSegment(flags: number, data: Buffer, { noRetransmit = false } = {}): void {
    const header = Buffer.alloc(TCP_HEADER + (flags & SYN ? 4 : 0));
    header.writeUInt16BE(this.localPort, 0);
    header.writeUInt16BE(this.remotePort, 2);
    header.writeUInt32BE(this.sendNext >>> 0, 4);
    header.writeUInt32BE(flags & ACK ? this.receiveNext >>> 0 : 0, 8);
    header[12] = (header.length / 4) << 4;
    header[13] = flags;
    header.writeUInt16BE(Math.min(0xffff, this.availableWindow()), 14);
    if (flags & SYN) {
      header[20] = 2;
      header[21] = 4;
      header.writeUInt16BE(this.mss, 22);
    }
    const segment = Buffer.concat([header, data]);
    segment.writeUInt16BE(0, 16);
    segment.writeUInt16BE(
      checksum(pseudoHeader(this.local, this.remote, segment.length, PROTO_TCP), segment),
      16
    );
    this.stack.transmit(buildIpv6(this.local, this.remote, PROTO_TCP, segment));
    const consumed = data.length + (flags & SYN ? 1 : 0) + (flags & FIN ? 1 : 0);
    if (consumed > 0 && !noRetransmit) {
      this.inFlight.push({
        seq: this.sendNext,
        length: consumed,
        data,
        flags,
        sentAt: Date.now(),
        retries: 0,
      });
      this.sendNext = add(this.sendNext, consumed);
      this.armRetransmit();
    }
  }

  availableWindow(): number {
    return Math.max(0, RECEIVE_WINDOW - this.receiveBuffered);
  }

  pump(): void {
    if (this.state !== 'ESTABLISHED' && this.state !== 'CLOSE_WAIT') return;
    let budget = this.peerWindow - ((this.sendNext - this.sendUnacked + MOD) % MOD);
    while (this.sendQueue.length && budget > 0) {
      const head = this.sendQueue[0];
      const size = Math.min(head.length, this.mss, budget);
      const piece = head.subarray(0, size);
      if (size === head.length) this.sendQueue.shift();
      else this.sendQueue[0] = head.subarray(size);
      this.sendQueueBytes -= size;
      const last = this.sendQueue.length === 0;
      this.sendSegment(ACK | (last ? PSH : 0), piece);
      budget -= size;
    }
    while (
      this.pendingWriteCallbacks.length &&
      this.sendQueueBytes + this.inFlightBytes() <= SEND_BUFFER_LIMIT / 2
    ) {
      this.pendingWriteCallbacks.shift()!();
    }
    if (this.finQueued && !this.finSent && this.sendQueue.length === 0) {
      this.finSent = true;
      this.sendSegment(FIN | ACK, Buffer.alloc(0));
      this.state = this.state === 'CLOSE_WAIT' ? 'LAST_ACK' : 'FIN_WAIT_1';
      if (this.finCallback) {
        this.finCallback();
        this.finCallback = null;
      }
    }
  }

  armRetransmit(): void {
    if (this.retransmitTimer || this.inFlight.length === 0) return;
    this.retransmitTimer = setTimeout(() => this.onRetransmitTimeout(), this.rto);
    this.retransmitTimer.unref?.();
  }

  onRetransmitTimeout(): void {
    this.retransmitTimer = null;
    const segment = this.inFlight[0];
    if (!segment) return;
    if (segment.retries >= MAX_RETRANSMITS) {
      this.destroy(new Error('connection timed out'));
      return;
    }
    segment.retries += 1;
    this.rto = Math.min(RTO_MAX, this.rto * 2);
    // Resend the oldest unacknowledged segment with its original sequence number.
    const saved = this.sendNext;
    this.sendNext = segment.seq;
    const flags = segment.flags | (segment.flags & SYN ? 0 : ACK);
    this.sendSegmentRaw(flags, segment.data);
    this.sendNext = saved;
    this.armRetransmit();
  }

  sendSegmentRaw(flags: number, data: Buffer): void {
    this.sendSegment(flags, data, { noRetransmit: true });
  }

  // ---- Receiving ----

  handleSegment(segment: Buffer): void {
    const seq = segment.readUInt32BE(4);
    const ack = segment.readUInt32BE(8);
    const dataOffset = (segment[12] >> 4) * 4;
    const flags = segment[13];
    const window = segment.readUInt16BE(14);
    const data = segment.subarray(dataOffset);

    if (flags & RST) {
      if (this.state !== 'CLOSED') {
        const error = new Error(
          this.state === 'SYN_SENT' ? 'connection refused' : 'connection reset by the device'
        );
        if (this.connectCallbacks) {
          this.connectCallbacks.reject(error);
          this.connectCallbacks = null;
          this.teardown();
          return;
        }
        this.teardown();
        // Destroying with an error on a stream nobody is listening to takes the process down, and
        // a device resetting a channel it no longer needs is routine. Report it only to a listener.
        this.destroy(!this.readableEnded && this.listenerCount('error') > 0 ? error : undefined);
      }
      return;
    }

    if (this.state === 'SYN_SENT') {
      if (!(flags & SYN) || !(flags & ACK)) return;
      if (ack !== add(this.sendUnacked, 1)) return;
      this.parseOptions(segment.subarray(TCP_HEADER, dataOffset));
      this.receiveNext = add(seq, 1);
      this.acknowledge(ack);
      this.peerWindow = window;
      this.state = 'ESTABLISHED';
      this.sendSegment(ACK, Buffer.alloc(0));
      if (this.connectCallbacks) {
        this.connectCallbacks.resolve(this);
        this.connectCallbacks = null;
      }
      this.pump();
      return;
    }

    if (this.state === 'SYN_RECEIVED') {
      if (flags & ACK && ack === add(this.sendUnacked, 1)) {
        this.acknowledge(ack);
        this.peerWindow = window;
        this.state = 'ESTABLISHED';
        this.stack.emit('accept', this);
        this.onAccept?.(this);
      } else {
        return;
      }
    }

    if (flags & ACK) {
      this.acknowledge(ack);
      this.peerWindow = window;
    }

    if (data.length > 0 || flags & FIN) {
      if (seq === this.receiveNext) {
        this.deliver(data, flags & FIN);
        // Drain any contiguous out-of-order segments.
        while (this.outOfOrder.has(this.receiveNext)) {
          const next = this.outOfOrder.get(this.receiveNext)!;
          this.outOfOrder.delete(this.receiveNext);
          this.deliver(next.data, next.fin);
        }
        this.sendSegment(ACK, Buffer.alloc(0), { noRetransmit: true });
      } else if (seqLt(this.receiveNext, seq) && this.outOfOrder.size < 64) {
        this.outOfOrder.set(seq, { data: Buffer.from(data), fin: flags & FIN });
        this.sendSegment(ACK, Buffer.alloc(0), { noRetransmit: true });
      } else {
        // Duplicate or stale: re-acknowledge.
        this.sendSegment(ACK, Buffer.alloc(0), { noRetransmit: true });
      }
    }

    if (this.state === 'FIN_WAIT_1' && this.finAcked()) {
      this.state = this.finReceived ? 'TIME_WAIT' : 'FIN_WAIT_2';
    }
    if (this.state === 'FIN_WAIT_2' && this.finReceived) this.state = 'TIME_WAIT';
    if (this.state === 'LAST_ACK' && this.finAcked()) {
      this.teardown();
      return;
    }
    if (this.state === 'TIME_WAIT' && !this.timeWaitTimer) {
      this.timeWaitTimer = setTimeout(() => this.teardown(), 2000);
      this.timeWaitTimer.unref?.();
    }
    this.pump();
  }

  finAcked(): boolean {
    return this.finSent && this.inFlight.length === 0;
  }

  parseOptions(options: Buffer): void {
    let offset = 0;
    while (offset < options.length) {
      const kind = options[offset];
      if (kind === 0) break;
      if (kind === 1) {
        offset += 1;
        continue;
      }
      const length = options[offset + 1] || 2;
      if (kind === 2 && length === 4) {
        this.mss = Math.min(this.mss, options.readUInt16BE(offset + 2));
      }
      offset += length;
    }
  }

  acknowledge(ack: number): void {
    if (!seqLe(ack, this.sendNext)) return;
    let progressed = false;
    while (this.inFlight.length && seqLe(add(this.inFlight[0].seq, this.inFlight[0].length), ack)) {
      this.inFlight.shift();
      progressed = true;
    }
    if (seqLt(this.sendUnacked, ack)) this.sendUnacked = ack;
    if (progressed) {
      this.rto = RTO_INITIAL;
      if (this.retransmitTimer) clearTimeout(this.retransmitTimer);
      this.retransmitTimer = null;
      this.armRetransmit();
    }
  }

  deliver(data: Buffer, fin: number): void {
    if (data.length > 0) {
      this.receiveNext = add(this.receiveNext, data.length);
      this.receiveBuffered += data.length;
      const chunk = Buffer.from(data);
      this.readWanted = this.push(chunk);
      // Reading is asynchronous; credit the window back once the consumer drains.
      queueMicrotask(() => {
        this.receiveBuffered = Math.max(0, this.receiveBuffered - chunk.length);
        this.maybeWindowUpdate();
      });
    }
    if (fin && !this.finReceived) {
      this.finReceived = true;
      this.receiveNext = add(this.receiveNext, 1);
      if (this.state === 'ESTABLISHED') this.state = 'CLOSE_WAIT';
      this.push(null);
    }
  }

  maybeWindowUpdate(): void {
    // Nothing to do for now: ACKs already carry the current window.
  }
}

/**
 * NetStack: feed inbound raw IPv6 packets with `receive(packet)`; it emits "packet" with raw
 * outbound IPv6 packets. `localAddress` is our tunnel address.
 */
export class NetStack extends EventEmitter {
  readonly localAddress: string;
  readonly localBytes: Buffer;
  readonly mtu: number;
  readonly connections: Map<string, TcpConnection>;
  readonly tcpListeners: Map<number, ConnectionHandler>;
  nextPort: number;

  constructor({ localAddress, mtu = 1500 }: NetStackOptions) {
    super();
    this.localAddress = localAddress;
    this.localBytes = ipToBytes(localAddress);
    this.mtu = mtu;
    this.connections = new Map();
    this.tcpListeners = new Map();
    this.nextPort = 49152 + crypto.randomInt(0, 8000);
  }

  transmit(packet: Buffer): void {
    this.emit('packet', packet);
  }

  allocatePort(): number {
    for (let i = 0; i < 16384; i += 1) {
      const port = 49152 + ((this.nextPort - 49152 + i) % 16384);
      const inUse =
        [...this.connections.values()].some((c) => c.localPort === port) ||
        this.tcpListeners.has(port);
      if (!inUse) {
        this.nextPort = port + 1;
        return port;
      }
    }
    throw new Error('no free ports');
  }

  /** Active open. Resolves an established Duplex. */
  connect(
    address: string | Buffer,
    port: number,
    { timeoutMs = 10_000 }: ConnectOptions = {}
  ): Promise<TcpConnection> {
    const remote = Buffer.isBuffer(address) ? address : ipToBytes(address);
    const connection = new TcpConnection(this, {
      local: this.localBytes,
      remote,
      localPort: this.allocatePort(),
      remotePort: port,
    });
    this.connections.set(connection.key, connection);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (connection.connectCallbacks) {
          connection.connectCallbacks = null;
          connection.teardown();
          reject(new Error(`connect timed out (${address}:${port})`));
        }
      }, timeoutMs);
      connection.connectCallbacks = {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      connection.state = 'SYN_SENT';
      connection.sendSegment(SYN, Buffer.alloc(0));
    });
  }

  /** Passive open. `onConnection(duplex)` fires once the handshake completes. */
  listen(port: number, onConnection: ConnectionHandler): { close: () => boolean } {
    this.tcpListeners.set(port, onConnection);
    return { close: () => this.tcpListeners.delete(port) };
  }

  receive(packet: Buffer): void {
    const parsed = parseIpv6(packet);
    if (!parsed) return;
    if (!parsed.dst.equals(this.localBytes)) return;
    if (parsed.proto === PROTO_TCP) this.receiveTcp(parsed);
    else if (parsed.proto === PROTO_ICMPV6) this.receiveIcmp(parsed);
  }

  receiveTcp({ src, payload }: ParsedIpv6): void {
    if (payload.length < TCP_HEADER) return;
    const remotePort = payload.readUInt16BE(0);
    const localPort = payload.readUInt16BE(2);
    const key = TcpConnection.keyFor(src, remotePort, localPort);
    let connection = this.connections.get(key);
    const flags = payload[13];
    if (!connection) {
      const listener = this.tcpListeners.get(localPort);
      if (listener && flags & SYN && !(flags & ACK)) {
        connection = new TcpConnection(this, {
          local: this.localBytes,
          remote: Buffer.from(src),
          localPort,
          remotePort,
        });
        connection.onAccept = listener;
        this.connections.set(key, connection);
        connection.parseOptions(payload.subarray(TCP_HEADER, (payload[12] >> 4) * 4));
        connection.receiveNext = add(payload.readUInt32BE(4), 1);
        connection.peerWindow = payload.readUInt16BE(14);
        connection.state = 'SYN_RECEIVED';
        connection.sendSegment(SYN | ACK, Buffer.alloc(0));
        return;
      }
      if (!(flags & RST)) this.sendReset(src, remotePort, localPort, payload);
      return;
    }
    connection.handleSegment(payload);
  }

  sendReset(remote: Buffer, remotePort: number, localPort: number, incoming: Buffer): void {
    const seq = incoming.readUInt32BE(8);
    const header = Buffer.alloc(TCP_HEADER);
    header.writeUInt16BE(localPort, 0);
    header.writeUInt16BE(remotePort, 2);
    header.writeUInt32BE(incoming[13] & ACK ? seq : 0, 4);
    const incomingDataLength = incoming.length - (incoming[12] >> 4) * 4;
    header.writeUInt32BE(
      add(incoming.readUInt32BE(4), incomingDataLength + (incoming[13] & SYN ? 1 : 0)),
      8
    );
    header[12] = 5 << 4;
    header[13] = RST | ACK;
    header.writeUInt16BE(
      checksum(pseudoHeader(this.localBytes, remote, header.length, PROTO_TCP), header),
      16
    );
    this.transmit(buildIpv6(this.localBytes, remote, PROTO_TCP, header));
  }

  receiveIcmp({ src, payload }: ParsedIpv6): void {
    if (payload[0] !== 128) return; // echo request
    const reply = Buffer.from(payload);
    reply[0] = 129;
    reply.writeUInt16BE(0, 2);
    reply.writeUInt16BE(
      checksum(pseudoHeader(this.localBytes, src, reply.length, PROTO_ICMPV6), reply),
      2
    );
    this.transmit(buildIpv6(this.localBytes, src, PROTO_ICMPV6, reply));
  }

  close(): void {
    for (const connection of [...this.connections.values()]) connection.destroy();
    this.connections.clear();
    this.tcpListeners.clear();
  }
}
