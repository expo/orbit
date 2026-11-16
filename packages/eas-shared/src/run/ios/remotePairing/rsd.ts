// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// RemoteServiceDiscovery: the RSD endpoint on the tunnel lists every service and its port.
import { Duplex } from 'stream';

import { parsePlist, toXmlPlist } from './plist';
import { RemoteXpcConnection, RemoteXpcError } from './remotexpc';

export const RSD_PORT = 58783;

export class RsdError extends Error {}

/** Anything that can open a TCP stream to the device (the userspace `NetStack`). */
export interface RsdStreamConnector {
  connect(address: string, port: number): Promise<Duplex>;
}

export interface RsdServiceEntry {
  Port: string | number;
  Properties?: {
    Features?: string[];
    UsesRemoteXPC?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface RsdPeerInfo {
  MessageType?: string;
  Properties: {
    UniqueDeviceID?: string;
    ProductType?: string;
    OSVersion?: string;
    [key: string]: unknown;
  };
  Services: Record<string, RsdServiceEntry>;
  [key: string]: unknown;
}

export class RemoteServiceDiscovery {
  stack: RsdStreamConnector;
  address: string;
  port: number;
  peerInfo: RsdPeerInfo | null = null;
  control: RemoteXpcConnection | null = null;

  /**
   * @param stack userspace stack that reaches the device
   * @param address device tunnel address
   */
  constructor(stack: RsdStreamConnector, address: string, port: number = RSD_PORT) {
    this.stack = stack;
    this.address = address;
    this.port = port;
  }

  async connect(): Promise<RsdPeerInfo> {
    const socket = await this.stack.connect(this.address, this.port);
    const control = new RemoteXpcConnection(socket);
    this.control = control;
    try {
      await control.connect();
      await control.sendDeviceHandshake();
      this.peerInfo = await control.receiveResponse();
    } catch (error) {
      control.close();
      throw error;
    }
    if (!this.peerInfo?.Properties || !this.peerInfo?.Services) {
      throw new RsdError('RSD handshake did not return peer info');
    }
    return this.peerInfo;
  }

  get properties(): RsdPeerInfo['Properties'] {
    return this.peerInfo?.Properties || {};
  }

  get udid(): string | undefined {
    return this.properties.UniqueDeviceID;
  }

  get productType(): string | undefined {
    return this.properties.ProductType;
  }

  get osVersion(): string | undefined {
    return this.properties.OSVersion;
  }

  get services(): Record<string, RsdServiceEntry> {
    return this.peerInfo?.Services || {};
  }

  serviceEntry(name: string): RsdServiceEntry {
    const entry = this.services[name];
    if (!entry) throw new RsdError(`device does not offer service ${name}`);
    return entry;
  }

  servicePort(name: string): number {
    return Number(this.serviceEntry(name).Port);
  }

  serviceFeatures(name: string): Set<string> {
    return new Set(this.serviceEntry(name).Properties?.Features || []);
  }

  hasFeature(name: string, feature: string): boolean {
    const features = this.serviceEntry(name).Properties?.Features;
    return !features || features.length === 0 || features.includes(feature);
  }

  /** Raw TCP connection to a service port (no RSD check-in). */
  connectRaw(port: number): Promise<Duplex> {
    return this.stack.connect(this.address, port);
  }

  /** RemoteXPC connection to a service (services flagged UsesRemoteXPC). */
  async startRemoteService(name: string): Promise<RemoteXpcConnection> {
    const socket = await this.connectRaw(this.servicePort(name));
    const connection = new RemoteXpcConnection(socket);
    await connection.connect();
    return connection;
  }

  /** Lockdown-style plist service with the RSDCheckin handshake. */
  async startLockdownService(name: string): Promise<PlistService> {
    const socket = await this.connectRaw(this.servicePort(name));
    const service = new PlistService(socket);
    try {
      const checkin = await service.sendReceive({
        Label: 'remote-device',
        ProtocolVersion: '2',
        Request: 'RSDCheckin',
      });
      if (checkin.Request !== 'RSDCheckin') {
        throw new RsdError(`unexpected RSDCheckin response: ${JSON.stringify(checkin)}`);
      }
      const started = await service.receive();
      if (started.Request !== 'StartService') {
        throw new RsdError(`unexpected StartService response: ${JSON.stringify(started)}`);
      }
      if (started.Error) throw new RsdError(`${name}: ${started.Error}`);
    } catch (error) {
      service.close();
      throw error;
    }
    return service;
  }

  /**
   * Same RSDCheckin/StartService handshake as `startLockdownService`, but hands back the raw
   * stream afterwards so a client that speaks the service's own framing (AFC, installation_proxy,
   * ...) can take over. Bytes the device sent right behind the StartService reply are pushed back
   * onto the stream, and the stream starts flowing again as soon as a 'data' listener is added.
   */
  async startLockdownServiceSocket(name: string): Promise<Duplex> {
    const service = await this.startLockdownService(name);
    return service.detach();
  }

  close(): void {
    this.control?.close();
  }
}

interface PlistWaiter {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

/** Length-prefixed plist messaging used by lockdown-style services. */
export class PlistService {
  socket: Duplex;
  buffer: Buffer = Buffer.alloc(0);
  waiters: PlistWaiter[] = [];
  closed: Error | null = null;
  private readonly onData: (chunk: Buffer) => void;
  private readonly onClose: () => void;
  private readonly onError: (error: Error) => void;

  constructor(socket: Duplex) {
    this.socket = socket;
    this.onData = (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.drain();
    };
    const finish = (error?: Error) => {
      this.closed = error || new RsdError('service connection closed');
      for (const waiter of this.waiters.splice(0)) waiter.reject(this.closed);
    };
    this.onClose = () => finish();
    this.onError = (error) => finish(error);
    socket.on('data', this.onData);
    socket.on('close', this.onClose);
    socket.on('error', this.onError);
  }

  drain(): void {
    while (this.waiters.length && this.buffer.length >= 4) {
      const size = this.buffer.readUInt32BE(0);
      if (this.buffer.length < 4 + size) return;
      const body = this.buffer.subarray(4, 4 + size);
      this.buffer = this.buffer.subarray(4 + size);
      const waiter = this.waiters.shift()!;
      try {
        waiter.resolve(parsePlist(body));
      } catch (error) {
        waiter.reject(error as Error);
      }
    }
  }

  send(value: unknown): Promise<void> {
    const payload = Buffer.from(toXmlPlist(value), 'utf8');
    const header = Buffer.alloc(4);
    header.writeUInt32BE(payload.length);
    return new Promise((resolve, reject) =>
      this.socket.write(Buffer.concat([header, payload]), (error) =>
        error ? reject(error) : resolve()
      )
    );
  }

  receive(timeoutMs = 15_000): Promise<any> {
    if (this.closed) return Promise.reject(this.closed);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(new RsdError('timed out waiting for plist'));
      }, timeoutMs);
      const waiter: PlistWaiter = {
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
      this.drain();
    });
  }

  async sendReceive(value: unknown): Promise<any> {
    await this.send(value);
    return this.receive();
  }

  /**
   * Stop plist framing and give the underlying stream back (not part of the original source).
   *
   * Any bytes already read past the last plist are unshifted back onto the stream. The stream is
   * paused first (removing a 'data' listener does not stop a flowing stream, so bytes would be
   * dropped), and resumed when the next consumer subscribes to 'data' (an explicitly paused
   * stream does not resume on its own when a listener is added).
   */
  detach(): Duplex {
    const socket = this.socket;
    socket.pause();
    socket.removeListener('data', this.onData);
    socket.removeListener('close', this.onClose);
    socket.removeListener('error', this.onError);
    for (const waiter of this.waiters.splice(0)) {
      waiter.reject(new RsdError('service connection detached'));
    }
    const leftover = this.buffer;
    this.buffer = Buffer.alloc(0);
    if (leftover.length) socket.unshift(leftover);
    const resumeOnData = (event: string | symbol) => {
      if (event !== 'data') return;
      socket.removeListener('newListener', resumeOnData);
      // 'newListener' fires before the listener is attached; resume() only starts delivering on
      // the next tick, by which time it is.
      socket.resume();
    };
    socket.on('newListener', resumeOnData);
    return socket;
  }

  close(): void {
    this.socket.destroy();
  }
}

export { RemoteXpcError };
