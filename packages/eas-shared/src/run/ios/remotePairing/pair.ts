// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// The pairing flow: advertise this machine as a pairable DeviceHub host, accept the iPhone's
// Pair-Setup, and persist the result.
import { EventEmitter } from 'events';
import net from 'net';

import { computeAuthTag } from './crypto';
import {
  Advertisement,
  HostAddress,
  PAIRABLE_HOST_SERVICE,
  TxtProperties,
  localAddresses,
  startAdvertising,
} from './mdns';
import { PairingHostInfo, PairingOutcome, acceptPairing } from './rppairing';
import { DeviceRecord, loadHostIdentity, saveDevice } from './store';

export const DEFAULT_PAIRING_PORT = 49152;

export interface PairDeviceOptions {
  /** Name shown on the iPhone; defaults to the persisted host identity's name. */
  name?: string;
  port?: number;
  timeoutMs?: number;
  stateDir?: string;
}

export interface PairingAdvertisingEvent {
  port: number;
  name: string;
  identifier: string;
  addresses: HostAddress[];
  txt: TxtProperties;
  backend: Advertisement['backend'];
}

/**
 * Events emitted on `pairDevice(...).events`:
 * - "advertising" (PairingAdvertisingEvent): the host is listening and advertised over Bonjour.
 * - "connected" (remote: string): an iPhone connected (`address:port`).
 * - "pin" (pin: string): the 6-digit code the user must type on the iPhone.
 * - "attempt-failed" (error: Error): one pairing attempt failed; still waiting for another.
 */
export interface PairDeviceEvents {
  advertising: (event: PairingAdvertisingEvent) => void;
  connected: (remote: string) => void;
  pin: (pin: string) => void;
  'attempt-failed': (error: Error) => void;
}

export interface PairingEventEmitter extends EventEmitter {
  on<E extends keyof PairDeviceEvents>(event: E, listener: PairDeviceEvents[E]): this;
  once<E extends keyof PairDeviceEvents>(event: E, listener: PairDeviceEvents[E]): this;
  off<E extends keyof PairDeviceEvents>(event: E, listener: PairDeviceEvents[E]): this;
  emit<E extends keyof PairDeviceEvents>(
    event: E,
    ...args: Parameters<PairDeviceEvents[E]>
  ): boolean;
}

export type PairDeviceSession = Promise<DeviceRecord> & { events: PairingEventEmitter };

/**
 * Run one pairing session. Emits: "advertising" ({ port, name, addresses }), "pin" (pin),
 * "connected" (remote), "attempt-failed" (error). Resolves the saved device record.
 */
export function pairDevice({
  name,
  port = DEFAULT_PAIRING_PORT,
  timeoutMs = 10 * 60 * 1000,
  stateDir,
}: PairDeviceOptions = {}): PairDeviceSession {
  const events = new EventEmitter() as PairingEventEmitter;
  const promise = (async () => {
    const identity = loadHostIdentity(stateDir);
    const hostInfo: PairingHostInfo = {
      name: name || identity.name,
      model: identity.model,
      identifier: identity.identifier,
      altIrk: identity.altIrk,
      udid: '',
    };

    let result: PairingOutcome | null = null;
    let resolveResult!: (outcome: PairingOutcome) => void;
    let rejectResult!: (error: Error) => void;
    const finished = new Promise<PairingOutcome>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    const server = net.createServer((socket) => {
      socket.setNoDelay(true);
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;
      events.emit('connected', remote);
      acceptPairing(socket, hostInfo, { onPin: (pin) => events.emit('pin', pin) })
        .then((outcome) => {
          if (result) return;
          result = outcome;
          socket.end();
          resolveResult(outcome);
        })
        .catch((error: Error) => {
          events.emit('attempt-failed', error);
          socket.destroy();
        });
    });
    const boundPort = await listen(server, port);
    server.on('error', rejectResult);
    const txt: TxtProperties = {
      name: hostInfo.name,
      identifier: hostInfo.identifier,
      authTag: computeAuthTag(hostInfo.altIrk, hostInfo.identifier).toString('base64'),
      model: hostInfo.model,
      flags: '1',
      ver: '26',
      minVer: '17',
    };
    let responder: Advertisement;
    try {
      responder = await startAdvertising({
        serviceType: PAIRABLE_HOST_SERVICE,
        instanceName: hostInfo.identifier,
        port: boundPort,
        txt,
      });
    } catch (error) {
      server.close();
      throw error;
    }
    events.emit('advertising', {
      port: boundPort,
      name: hostInfo.name,
      identifier: hostInfo.identifier,
      addresses: localAddresses(),
      txt,
      backend: responder.backend,
    });
    const timer = setTimeout(
      () => rejectResult(new Error('timed out waiting for the iPhone to pair')),
      timeoutMs
    );
    try {
      const outcome = await finished;
      const record = saveDevice(
        {
          udid: outcome.peer.udid || outcome.peer.accountId,
          name: outcome.peer.name,
          model: outcome.peer.model,
          accountId: outcome.peer.accountId,
          hostIdentifier: hostInfo.identifier,
          hostAltIrk: hostInfo.altIrk,
          peerAltIrk: outcome.peer.altIrk,
          privateKey: outcome.ed25519.seed,
          publicKey: outcome.ed25519.publicKey,
          pairedAt: new Date().toISOString(),
        },
        stateDir
      );
      return record;
    } finally {
      clearTimeout(timer);
      responder.stop();
      server.close();
    }
  })() as PairDeviceSession;
  promise.events = events;
  return promise;
}

function listen(server: net.Server, preferred: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number, attempt: number = 0) => {
      server.once('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE' && port !== 0) {
          server.removeAllListeners('listening');
          tryPort(attempt < 8 ? port + 1 : 0, attempt + 1);
          return;
        }
        reject(error);
      });
      server.once('listening', () => {
        server.removeAllListeners('error');
        resolve((server.address() as net.AddressInfo).port);
      });
      // Binds dual-stack (:: with IPv4 mapped), so a phone that dials this computer's IPv6
      // address reaches us too.
      server.listen(port);
    };
    tryPort(preferred);
  });
}
