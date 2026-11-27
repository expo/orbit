// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// RemoteXPC: XPC messages carried in HTTP/2 DATA frames over a raw duplex stream. Implements the
// exact frame choreography remoted expects (which is why a generic HTTP/2 client will not do).
import { EventEmitter } from 'events';
import { Duplex } from 'stream';

import {
  XPC_WRAPPER_MAGIC,
  XpcFlags,
  XpcUuid,
  decodeXpcWrapper,
  encodeXpcMessage,
  encodeXpcWrapper,
  uint64,
} from './xpc';

export const HTTP2_PREFACE = Buffer.from('PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n', 'latin1');
export const FRAME = Object.freeze({
  DATA: 0,
  HEADERS: 1,
  RST_STREAM: 3,
  SETTINGS: 4,
  PING: 6,
  GOAWAY: 7,
  WINDOW_UPDATE: 8,
});
const FLAG_ACK = 0x1;
const FLAG_END_HEADERS = 0x4;

const ROOT_CHANNEL = 1;
const REPLY_CHANNEL = 3;
const MAX_CONCURRENT_STREAMS = 100;
const INITIAL_WINDOW_SIZE = 16 * 1024 * 1024;
const WINDOW_UPDATE_THRESHOLD = 1024 * 1024;
const MAX_FRAME_PAYLOAD = 16384;
const REMOTE_XPC_VERSION_FLAGS = 0x0100000000000006n;
const MESSAGING_PROTOCOL_VERSION = 7;

/** A decoded XPC dictionary (genuinely dynamic data from the device). */
export type RemoteXpcMessage = { [key: string]: any };

export interface Http2Frame {
  type: number;
  flags: number;
  streamId: number;
  payload: Buffer;
}

export class RemoteXpcError extends Error {}

export function encodeFrame(
  type: number,
  flags: number,
  streamId: number,
  payload: Buffer = Buffer.alloc(0)
): Buffer {
  const header = Buffer.alloc(9);
  header.writeUIntBE(payload.length, 0, 3);
  header[3] = type;
  header[4] = flags;
  header.writeUInt32BE(streamId >>> 0, 5);
  return Buffer.concat([header, payload]);
}

export function encodeSettings(settings: [number, number][], ack = false): Buffer {
  const payload = Buffer.alloc(settings.length * 6);
  settings.forEach(([id, value], index) => {
    payload.writeUInt16BE(id, index * 6);
    payload.writeUInt32BE(value, index * 6 + 2);
  });
  return encodeFrame(FRAME.SETTINGS, ack ? FLAG_ACK : 0, 0, ack ? Buffer.alloc(0) : payload);
}

export function encodeWindowUpdate(streamId: number, increment: number): Buffer {
  const payload = Buffer.alloc(4);
  payload.writeUInt32BE(increment);
  return encodeFrame(FRAME.WINDOW_UPDATE, 0, streamId, payload);
}

/** Incremental HTTP/2 frame parser. */
export class FrameParser {
  buffer: Buffer = Buffer.alloc(0);

  push(chunk: Buffer): Http2Frame[] {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : Buffer.from(chunk);
    const frames: Http2Frame[] = [];
    while (this.buffer.length >= 9) {
      const length = this.buffer.readUIntBE(0, 3);
      if (this.buffer.length < 9 + length) break;
      frames.push({
        type: this.buffer[3],
        flags: this.buffer[4],
        streamId: this.buffer.readUInt32BE(5) & 0x7fffffff,
        payload: Buffer.from(this.buffer.subarray(9, 9 + length)),
      });
      this.buffer = this.buffer.subarray(9 + length);
    }
    return frames;
  }
}

interface FrameWaiter {
  resolve: (frame: Http2Frame) => void;
  reject: (error: Error) => void;
}

interface PartialMessage {
  chunks: Buffer[];
  length: number;
  expected: number | null;
}

export interface RemoteXpcConnectionOptions {
  timeoutMs?: number;
}

/**
 * One RemoteXPC connection over a duplex stream (a userspace-TCP Duplex, or anything else).
 */
export class RemoteXpcConnection extends EventEmitter {
  stream: Duplex;
  timeoutMs: number;
  parser = new FrameParser();
  frames: Http2Frame[] = [];
  waiters: FrameWaiter[] = [];
  nextMessageId: Record<number, number> = { [ROOT_CHANNEL]: 0, [REPLY_CHANNEL]: 0 };
  // streamId -> { chunks, length, expected } of a message split over frames
  partial = new Map<number, PartialMessage>();
  pendingWindow = new Map<number, number>();
  peerWindow = 65535;
  closed: Error | null = null;
  queue: Promise<unknown> = Promise.resolve();

  constructor(stream: Duplex, { timeoutMs = 15_000 }: RemoteXpcConnectionOptions = {}) {
    super();
    this.stream = stream;
    this.timeoutMs = timeoutMs;
    stream.on('data', (chunk: Buffer) => {
      let frames: Http2Frame[];
      try {
        frames = this.parser.push(chunk);
      } catch (error) {
        this.fail(error as Error);
        return;
      }
      for (const frame of frames) this.frames.push(frame);
      this.wake();
    });
    const finish = (error?: Error) =>
      this.fail(error || new RemoteXpcError('RemoteXPC connection closed'));
    stream.on('end', () => finish());
    stream.on('close', () => finish());
    stream.on('error', (error: Error) => finish(error));
  }

  fail(error: Error): void {
    if (this.closed) return;
    this.closed = error;
    for (const waiter of this.waiters.splice(0)) waiter.reject(error);
    this.emit('close', error);
  }

  wake(): void {
    while (this.waiters.length && this.frames.length) {
      this.waiters.shift()!.resolve(this.frames.shift()!);
    }
  }

  nextFrame(): Promise<Http2Frame> {
    if (this.frames.length) return Promise.resolve(this.frames.shift()!);
    if (this.closed) return Promise.reject(this.closed);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(new RemoteXpcError(`timed out waiting for RemoteXPC frame (${this.timeoutMs}ms)`));
      }, this.timeoutMs);
      const waiter: FrameWaiter = {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      this.waiters.push(waiter);
    });
  }

  write(data: Buffer): Promise<void> {
    return new Promise((resolve, reject) =>
      this.stream.write(data, (error) => (error ? reject(error) : resolve()))
    );
  }

  /** HTTP/2 preface plus the RemoteXPC channel setup sequence. */
  async connect(): Promise<this> {
    await this.write(
      Buffer.concat([
        HTTP2_PREFACE,
        encodeSettings([
          [3, MAX_CONCURRENT_STREAMS],
          [4, INITIAL_WINDOW_SIZE],
        ]),
        encodeWindowUpdate(0, INITIAL_WINDOW_SIZE - 65535),
        encodeFrame(FRAME.HEADERS, FLAG_END_HEADERS, ROOT_CHANNEL),
      ])
    );
    await this.sendRequest({});
    await this.write(
      Buffer.concat([
        encodeFrame(FRAME.HEADERS, FLAG_END_HEADERS, REPLY_CHANNEL),
        encodeFrame(FRAME.DATA, 0, ROOT_CHANNEL, encodeXpcWrapper({ flags: 0x0201 })),
        encodeFrame(
          FRAME.DATA,
          0,
          REPLY_CHANNEL,
          encodeXpcWrapper({ flags: XpcFlags.ALWAYS_SET | XpcFlags.INIT_HANDSHAKE })
        ),
      ])
    );
    this.nextMessageId[REPLY_CHANNEL] += 1;
    for (;;) {
      const frame = await this.nextFrame();
      if (frame.type === FRAME.SETTINGS && !(frame.flags & FLAG_ACK)) {
        this.applySettings(frame);
        break;
      }
      if (frame.type === FRAME.WINDOW_UPDATE || frame.type === FRAME.SETTINGS) {
        this.applyFlowControl(frame);
        continue;
      }
      throw new RemoteXpcError(`unexpected frame type ${frame.type} before SETTINGS`);
    }
    await this.write(encodeSettings([], true));
    return this;
  }

  applySettings(frame: Http2Frame): void {
    for (let offset = 0; offset + 6 <= frame.payload.length; offset += 6) {
      if (frame.payload.readUInt16BE(offset) === 4) {
        this.peerWindow = frame.payload.readUInt32BE(offset + 2);
      }
    }
  }

  applyFlowControl(frame: Http2Frame): void {
    if (frame.type === FRAME.SETTINGS && !(frame.flags & FLAG_ACK)) this.applySettings(frame);
  }

  /** Announce ourselves as a modern RemoteXPC peer (RSD control connection only). */
  sendDeviceHandshake(): Promise<void> {
    return this.sendRequest({
      MessageType: 'Handshake',
      MessagingProtocolVersion: uint64(MESSAGING_PROTOCOL_VERSION),
      UUID: XpcUuid.random(),
      Properties: {
        RemoteXPCVersionFlags: uint64(REMOTE_XPC_VERSION_FLAGS),
        SensitivePropertiesVisible: true,
      },
      Services: {},
    });
  }

  async sendRequest(
    body: RemoteXpcMessage,
    { wantingReply = false }: { wantingReply?: boolean } = {}
  ): Promise<void> {
    const wrapper = encodeXpcMessage(body, {
      messageId: this.nextMessageId[ROOT_CHANNEL],
      wantingReply,
    });
    this.nextMessageId[ROOT_CHANNEL] += 1;
    for (let offset = 0; offset < wrapper.length || offset === 0; offset += MAX_FRAME_PAYLOAD) {
      await this.write(
        encodeFrame(
          FRAME.DATA,
          0,
          ROOT_CHANNEL,
          wrapper.subarray(offset, offset + MAX_FRAME_PAYLOAD)
        )
      );
      if (wrapper.length === 0) break;
    }
  }

  async receiveResponse(): Promise<any> {
    for (;;) {
      const frame = await this.nextFrame();
      if (frame.type === FRAME.GOAWAY) {
        throw new RemoteXpcError(
          `device closed the connection (GOAWAY ${frame.payload.readUInt32BE(4)})`
        );
      }
      if (frame.type === FRAME.RST_STREAM) {
        throw new RemoteXpcError(`stream ${frame.streamId} reset`);
      }
      if (frame.type === FRAME.PING && !(frame.flags & FLAG_ACK)) {
        await this.write(encodeFrame(FRAME.PING, FLAG_ACK, 0, frame.payload));
        continue;
      }
      if (frame.type === FRAME.SETTINGS && !(frame.flags & FLAG_ACK)) {
        this.applySettings(frame);
        await this.write(encodeSettings([], true));
        continue;
      }
      if (frame.type !== FRAME.DATA) continue;
      if (frame.payload.length) await this.replenishWindow(frame.streamId, frame.payload.length);

      // Reassemble without recopying: a screenshot arrives as hundreds of frames, and
      // concatenating the whole message per frame made a 5 MB capture copy hundreds of
      // megabytes and take tens of seconds.
      let pending = this.partial.get(frame.streamId);
      if (!pending) {
        pending = { chunks: [], length: 0, expected: null };
        this.partial.set(frame.streamId, pending);
      }
      pending.chunks.push(frame.payload);
      pending.length += frame.payload.length;
      if (pending.expected === null && pending.length >= 16) {
        const header =
          pending.chunks.length === 1
            ? pending.chunks[0]
            : Buffer.concat(pending.chunks, Math.min(pending.length, 16));
        if (header.readUInt32LE(0) !== XPC_WRAPPER_MAGIC) {
          this.partial.delete(frame.streamId);
          throw new RemoteXpcError('invalid XPC wrapper magic');
        }
        pending.expected = 16 + Number(header.readBigUInt64LE(8)) + 8;
      }
      if (pending.expected === null || pending.length < pending.expected) continue;

      const message = Buffer.concat(pending.chunks, pending.length);
      this.partial.delete(frame.streamId);
      const wrapper = decodeXpcWrapper(message);
      if (!wrapper) continue;
      if (wrapper.length < message.length) {
        // A frame carried the tail of this message plus the head of the next one.
        this.partial.set(frame.streamId, {
          chunks: [message.subarray(wrapper.length)],
          length: message.length - wrapper.length,
          expected: null,
        });
      }
      const payload: unknown = wrapper.payload;
      if (payload === null) continue;
      if (
        typeof payload === 'object' &&
        !Array.isArray(payload) &&
        Object.keys(payload as object).length === 0
      ) {
        continue;
      }
      this.nextMessageId[frame.streamId] = Number(wrapper.messageId) + 1;
      return payload;
    }
  }

  async replenishWindow(streamId: number, amount: number): Promise<void> {
    const pending = (this.pendingWindow.get(streamId) || 0) + amount;
    if (pending < WINDOW_UPDATE_THRESHOLD) {
      this.pendingWindow.set(streamId, pending);
      return;
    }
    this.pendingWindow.delete(streamId);
    await this.write(
      Buffer.concat([encodeWindowUpdate(0, pending), encodeWindowUpdate(streamId, pending)])
    );
  }

  /** Serialised request/response round trip. */
  sendReceive(body: RemoteXpcMessage): Promise<any> {
    const run = async () => {
      await this.sendRequest(body, { wantingReply: true });
      return this.receiveResponse();
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => {});
    return result;
  }

  close(): void {
    this.stream.destroy();
  }
}
