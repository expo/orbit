// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// CoreDevice TCP tunnel: TLS 1.2 with a pre-shared key (the pair-verify session key), a small
// "CDTunnel" JSON handshake, then raw IPv6 packets in both directions feeding the userspace stack.
import { EventEmitter } from 'events';
import net from 'net';
import { Duplex } from 'stream';

import { NetStack } from './netstack';
import { TlsPskSocket } from './tlsPsk';

export const CDTUNNEL_MAGIC = Buffer.from('CDTunnel', 'latin1');
export const REQUESTED_MTU = 16000;

export class TunnelError extends Error {}

/** Arbitrary JSON body of a CDTunnel frame. */
export type CdTunnelBody = Record<string, unknown>;

/** The server's reply to `clientHandshakeRequest`. */
export interface CdTunnelHandshakeResponse {
  type?: string;
  clientParameters?: { address?: string; netmask?: string; mtu?: number };
  serverAddress?: string;
  serverRSDPort?: number;
  [key: string]: unknown;
}

export interface ConnectTlsPskOptions {
  connectTimeoutMs?: number;
  /** Custom transport factory (defaults to `net.connect`). */
  connect?: ((host: string, port: number) => Duplex) | null;
}

export interface EstablishTunnelOptions {
  mtu?: number;
}

/** The established CoreDevice tunnel. Emits "close" once the underlying socket closes. */
export interface Tunnel extends EventEmitter {
  stack: NetStack;
  clientAddress: string;
  serverAddress: string;
  rsdPort: number | undefined;
  mtu: number;
  socket: TlsPskSocket;
  close(): void;
}

export function encodeCdTunnel(body: CdTunnelBody): Buffer {
  const payload = Buffer.from(JSON.stringify(body), 'utf8');
  const header = Buffer.alloc(CDTUNNEL_MAGIC.length + 2);
  CDTUNNEL_MAGIC.copy(header);
  header.writeUInt16BE(payload.length, CDTUNNEL_MAGIC.length);
  return Buffer.concat([header, payload]);
}

export function decodeCdTunnel(buffer: Buffer): { body: unknown; length: number } | null {
  if (buffer.length < CDTUNNEL_MAGIC.length + 2) return null;
  if (!buffer.subarray(0, CDTUNNEL_MAGIC.length).equals(CDTUNNEL_MAGIC)) {
    throw new TunnelError('invalid CDTunnel magic');
  }
  const size = buffer.readUInt16BE(CDTUNNEL_MAGIC.length);
  const total = CDTUNNEL_MAGIC.length + 2 + size;
  if (buffer.length < total) return null;
  const json = buffer.subarray(CDTUNNEL_MAGIC.length + 2, total).toString('utf8');
  return { body: JSON.parse(json), length: total };
}

/** Splits a byte stream into whole IPv6 packets using the payload-length header field. */
export class Ipv6Splitter {
  private buffer: Buffer;

  constructor() {
    this.buffer = Buffer.alloc(0);
  }

  push(chunk: Buffer): Buffer[] {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : Buffer.from(chunk);
    const packets: Buffer[] = [];
    while (this.buffer.length >= 40) {
      const total = 40 + this.buffer.readUInt16BE(4);
      if (this.buffer.length < total) break;
      packets.push(Buffer.from(this.buffer.subarray(0, total)));
      this.buffer = this.buffer.subarray(total);
    }
    return packets;
  }
}

/**
 * TLS-PSK client connection to host:port. Resolves the socket once the handshake completes.
 * Uses Orbit's own TLS-PSK client: Node's `tls` cannot do this handshake on Electron's runtime.
 */
export function connectTlsPsk(
  host: string,
  port: number,
  psk: Buffer,
  { connectTimeoutMs = 10_000, connect = null }: ConnectTlsPskOptions = {}
): Promise<TlsPskSocket> {
  return new Promise((resolve, reject) => {
    // An open socket keeps the CLI process alive, so each failure closes both.
    const fail = (error: Error): void => {
      clearTimeout(timer);
      secure.destroy();
      tcp.destroy();
      reject(error);
    };
    const timer = setTimeout(
      () => fail(new TunnelError(`timed out connecting to ${host}:${port}`)),
      connectTimeoutMs
    );
    const tcp: Duplex = connect ? connect(host, port) : net.connect({ host, port });
    const socketLike = tcp as Partial<Pick<net.Socket, 'setNoDelay' | 'setKeepAlive'>>;
    socketLike.setNoDelay?.(true);
    socketLike.setKeepAlive?.(true, 10_000);
    tcp.once('error', fail);
    const secure = new TlsPskSocket(tcp, psk);
    secure.once('error', fail);
    secure.once('secureConnect', () => {
      clearTimeout(timer);
      tcp.removeListener('error', fail);
      resolve(secure);
    });
  });
}

/**
 * Open the CoreDevice tunnel on top of a connected TLS socket.
 * Resolves { stack, clientAddress, serverAddress, rsdPort, mtu, close } and emits "close".
 */
export async function establishTunnel(
  secure: TlsPskSocket,
  options: EstablishTunnelOptions = {}
): Promise<Tunnel> {
  try {
    return await establishTunnelOnSocket(secure, options);
  } catch (error) {
    // The caller has no tunnel to close yet.
    secure.destroy();
    throw error;
  }
}

async function establishTunnelOnSocket(
  secure: TlsPskSocket,
  { mtu = REQUESTED_MTU }: EstablishTunnelOptions
): Promise<Tunnel> {
  const handshake = await new Promise<{ body: CdTunnelHandshakeResponse; rest: Buffer }>(
    (resolve, reject) => {
      let buffer = Buffer.alloc(0);
      const timer = setTimeout(
        () => reject(new TunnelError('timed out waiting for CDTunnel handshake')),
        10_000
      );
      const onData = (chunk: Buffer): void => {
        buffer = Buffer.concat([buffer, chunk]);
        let decoded: ReturnType<typeof decodeCdTunnel>;
        try {
          decoded = decodeCdTunnel(buffer);
        } catch (error) {
          cleanup();
          reject(error);
          return;
        }
        if (!decoded) return;
        cleanup();
        resolve({
          body: decoded.body as CdTunnelHandshakeResponse,
          rest: buffer.subarray(decoded.length),
        });
      };
      const onError = (error: Error): void => {
        cleanup();
        reject(error);
      };
      const cleanup = (): void => {
        clearTimeout(timer);
        secure.removeListener('data', onData);
        secure.removeListener('error', onError);
      };
      secure.on('data', onData);
      secure.on('error', onError);
      secure.write(encodeCdTunnel({ type: 'clientHandshakeRequest', mtu }));
    }
  );
  const { clientParameters, serverAddress, serverRSDPort } = handshake.body;
  if (!clientParameters?.address || !serverAddress) {
    throw new TunnelError(`unexpected tunnel handshake: ${JSON.stringify(handshake.body)}`);
  }

  const stack = new NetStack({
    localAddress: clientParameters.address,
    mtu: clientParameters.mtu || mtu,
  });
  const emitter = new EventEmitter();
  const splitter = new Ipv6Splitter();
  const inbound = (chunk: Buffer): void => {
    for (const packet of splitter.push(chunk)) stack.receive(packet);
  };
  stack.on('packet', (packet: Buffer) => {
    if (!secure.destroyed) secure.write(packet);
  });
  secure.on('data', inbound);
  if (handshake.rest.length) inbound(handshake.rest);
  const onClose = (): void => {
    stack.close();
    emitter.emit('close');
  };
  secure.on('close', onClose);
  secure.on('error', () => {});

  const tunnel: Tunnel = Object.assign(emitter, {
    stack,
    clientAddress: clientParameters.address,
    serverAddress,
    rsdPort: serverRSDPort,
    mtu: clientParameters.mtu || mtu,
    socket: secure,
    close() {
      secure.destroy();
    },
  });
  return tunnel;
}
