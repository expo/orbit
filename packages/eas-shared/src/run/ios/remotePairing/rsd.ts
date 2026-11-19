// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// RemoteServiceDiscovery: the RSD endpoint on the tunnel lists every service and its port.
import { Socket } from 'net';
import { Duplex } from 'stream';

import { RemoteXpcConnection, RemoteXpcError } from './remotexpc';
import { LockdownProtocolClient } from '../appleDevice/protocol/LockdownProtocol';

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

  /**
   * Open a lockdown-protocol service (`*.shim.remote`) with the RSDCheckin handshake and return
   * the stream, ready for a client that speaks the service's own framing (AFCClient,
   * InstallationProxyClient). These services wait for the client to speak first, so nothing is
   * left unread behind the StartService reply.
   */
  async startLockdownServiceSocket(name: string): Promise<Duplex> {
    const socket = await this.connectRaw(this.servicePort(name));
    const client = new LockdownProtocolClient(socket as Socket);
    try {
      await client.sendMessage(
        { Label: 'Expo Orbit', ProtocolVersion: '2', Request: 'RSDCheckin' } as any,
        (response: any, resolve, reject) => {
          if (response.Request === 'StartService') {
            resolve();
          } else if (response.Request !== 'RSDCheckin') {
            reject(new RsdError(`${name}: unexpected response ${JSON.stringify(response)}`));
          }
        }
      );
    } catch (error) {
      socket.destroy();
      throw error;
    }
    return socket;
  }

  close(): void {
    this.control?.close();
  }
}

export { RemoteXpcError };
