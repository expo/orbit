// A connection to an iPhone paired over Wi-Fi, adapted from remote-device's DeviceSession
// (MIT, https://github.com/expo/appdrop) without the reconnect loop or input/screen features:
//   locate listener -> pair-verify -> CoreDevice tunnel (TLS-PSK) -> userspace stack -> RSD
import debug from 'debug';
import net from 'net';
import { Duplex } from 'stream';

import { AppService } from './coredevice';
import { discoverOnLan, probe, ProbeResult, sweepLocalSubnets } from './discovery';
import { PairVerifyFailedError, RemotePairingClient } from './rppairing';
import { RemoteServiceDiscovery } from './rsd';
import { DeviceRecord, updateDevice } from './store';
import { connectTlsPsk, establishTunnel, Tunnel } from './tunnel';

const log = debug('expo:remote-pairing');

export class DeviceUnreachableError extends Error {}
export class NotPairedError extends Error {}

type Endpoint = { host: string; port: number };

export class RemoteDeviceSession {
  private control: RemotePairingClient | null = null;
  private tunnel: Tunnel | null = null;
  private appService: AppService | null = null;
  rsd: RemoteServiceDiscovery | null = null;

  constructor(
    public record: DeviceRecord,
    private stateDir?: string
  ) {}

  /** Real device UDID once connected; the pairing may only know the account id. */
  get udid(): string {
    return this.rsd?.udid ?? this.record.udid;
  }

  /** Candidate RemotePairing listeners, most likely first. */
  private async locateAsync(): Promise<Endpoint[]> {
    const { lastHost, lastPort } = this.record;
    if (lastHost && lastPort) {
      const result = await probe(lastHost, lastPort, { timeoutMs: 1500 });
      if (result && (!result.peer?.udid || result.peer.udid === this.record.udid)) {
        return [result];
      }
    }
    const found = (await discoverOnLan({ timeoutMs: 5000, record: this.record })).filter(
      (entry): entry is ProbeResult => entry.reachable !== false
    );
    const matches = found.filter((entry) => entry.matches);
    if (matches.length) return matches;
    // Only a matching authTag identifies this phone; others are worth a try anyway since the
    // advertisement can lag behind a fresh pairing.
    if (found.length) return found;
    const swept = await sweepLocalSubnets({ ports: [lastPort || 49152] });
    if (swept.length) return swept;
    throw new DeviceUnreachableError(
      `${this.record.name ?? 'The iPhone'} was not found on the network. Make sure it is on the same Wi-Fi as this computer, unlocked, and that Developer Mode is on.`
    );
  }

  async connectAsync(): Promise<this> {
    if (this.rsd) return this;
    const candidates = await this.locateAsync();
    let control: RemotePairingClient | null = null;
    let endpoint: Endpoint | null = null;
    let lastError: unknown = null;
    for (const candidate of candidates) {
      log(`RemotePairing listener at ${candidate.host}:${candidate.port}`);
      let socket: net.Socket;
      try {
        socket = await connectSocketAsync(candidate);
      } catch (error) {
        lastError = error;
        continue;
      }
      const attempt = new RemotePairingClient(socket, {
        hostIdentifier: this.record.hostIdentifier,
        privateKey: this.record.privateKey,
      });
      try {
        await attempt.connect();
        control = attempt;
        endpoint = candidate;
        break;
      } catch (error) {
        attempt.close();
        lastError = error;
        log(`${candidate.host}:${candidate.port}: %O`, error);
      }
    }
    if (!control || !endpoint) {
      if (lastError instanceof PairVerifyFailedError) {
        throw new NotPairedError(
          `${this.record.name ?? 'The iPhone'} no longer trusts this computer. Pair it again from Orbit.`
        );
      }
      throw lastError ?? new DeviceUnreachableError('Could not connect to the iPhone');
    }

    try {
      const listener = await control.createTcpListener();
      const secure = await connectTlsPsk(endpoint.host, listener.port, control.encryptionKey!);
      const tunnel = await establishTunnel(secure);
      log(`tunnel up: ${tunnel.clientAddress} -> ${tunnel.serverAddress}:${tunnel.rsdPort}`);
      this.tunnel = tunnel;
      const rsd = new RemoteServiceDiscovery(tunnel.stack, tunnel.serverAddress, tunnel.rsdPort);
      await rsd.connect();
      this.rsd = rsd;
      this.control = control;
    } catch (error) {
      control.close();
      this.close();
      throw error;
    }

    try {
      this.record = updateDevice(
        this.record.udid,
        {
          lastHost: endpoint.host,
          lastPort: endpoint.port,
          lastSeenAt: new Date().toISOString(),
          osVersion: this.rsd.osVersion,
          productType: this.rsd.productType,
        },
        this.stateDir
      );
    } catch (error) {
      log('Failed to update the pairing record: %O', error);
    }
    return this;
  }

  /** A lockdown-protocol service (`*.shim.remote`) as a raw stream for Orbit's clients. */
  async startLockdownServiceAsync(name: string): Promise<Duplex> {
    await this.connectAsync();
    return this.rsd!.startLockdownServiceSocket(name);
  }

  async getAppServiceAsync(): Promise<AppService> {
    await this.connectAsync();
    if (!this.appService) {
      const service = new AppService(this.rsd!);
      await service.connect();
      this.appService = service;
    }
    return this.appService;
  }

  close() {
    for (const closeable of [this.appService, this.rsd, this.tunnel, this.control]) {
      try {
        closeable?.close();
      } catch {}
    }
    this.appService = null;
    this.rsd = null;
    this.tunnel = null;
    this.control = null;
  }
}

function connectSocketAsync({ host, port }: Endpoint): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 5000);
    socket.once('connect', () => resolve(socket));
    socket.once('error', reject);
  });
}
