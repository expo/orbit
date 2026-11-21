// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// The pairing flow: advertise this machine as a pairable DeviceHub host, accept the iPhone's
// Pair-Setup, and persist the result.
import crypto from 'crypto';
import { EventEmitter } from 'events';
import fs from 'fs';
import net from 'net';
import path from 'path';

import { computeAuthTag } from './crypto';
import {
  Advertisement,
  HostAddress,
  PAIRABLE_HOST_SERVICE,
  TxtProperties,
  localAddresses,
  startAdvertising,
} from './mdns';
import { PairingError, PairingHostInfo, PairingOutcome, acceptPairing } from './rppairing';
import { DeviceRecord, STATE_DIR, loadHostIdentity, saveDevice } from './store';
import { installExitHooks } from '../../../utils/exit';

export const DEFAULT_PAIRING_PORT = 49152;

/** A wrong PIN is one guess in 10^6; nobody honest needs more than a few. */
const MAX_FAILED_PIN_ATTEMPTS = 5;

/**
 * Holds the token of the pairing session that owns this computer's advertisement. A session
 * stops when the token is no longer its own: a newer session started, or the pairing window
 * closed (`cancelPairing`). Nothing else can stop a CLI process the menu bar no longer awaits.
 */
const sessionFile = (stateDir: string = STATE_DIR) => path.join(stateDir, 'pairing-session');

function claimSession(stateDir?: string): string {
  const token = crypto.randomUUID();
  fs.mkdirSync(path.dirname(sessionFile(stateDir)), { recursive: true, mode: 0o700 });
  fs.writeFileSync(sessionFile(stateDir), token);
  return token;
}

/** Stop the pairing session in progress on this computer, if any. */
export function cancelPairing(stateDir?: string): void {
  claimSession(stateDir);
}

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
 * - "attempt-failed" (error: Error, pinShown: boolean): one pairing attempt failed; still waiting
 *   for another. `pinShown` is true when it was the attempt whose PIN is on screen.
 */
export interface PairDeviceEvents {
  advertising: (event: PairingAdvertisingEvent) => void;
  connected: (remote: string) => void;
  pin: (pin: string) => void;
  'attempt-failed': (error: Error, pinShown: boolean) => void;
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
    const token = claimSession(stateDir);
    // The one attempt whose PIN is on screen. Connections that never reach Pair-Setup (probes)
    // are not limited; a second PIN would replace the one the user is typing.
    let pinHolder: net.Socket | null = null;
    let failedPins = 0;
    const server = net.createServer((socket) => {
      socket.setNoDelay(true);
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;
      events.emit('connected', remote);
      acceptPairing(socket, hostInfo, {
        onPin: (pin) => {
          if (pinHolder) throw new PairingError('another pairing attempt is in progress');
          pinHolder = socket;
          events.emit('pin', pin);
        },
      })
        .then((outcome) => {
          if (result) return;
          result = outcome;
          socket.end();
          resolveResult(outcome);
        })
        .catch((error: Error) => {
          const pinShown = pinHolder === socket;
          if (pinShown) pinHolder = null;
          events.emit('attempt-failed', error, pinShown);
          socket.destroy();
          if (pinShown && ++failedPins >= MAX_FAILED_PIN_ATTEMPTS) {
            rejectResult(new Error('Too many failed pairing attempts. Start pairing again.'));
          }
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
    const superseded = setInterval(() => {
      try {
        if (fs.readFileSync(sessionFile(stateDir), 'utf8') !== token) {
          rejectResult(new Error('pairing was cancelled'));
        }
      } catch {}
    }, 1000);
    // A signal skips the `finally` below and would leave the `dns-sd` child advertising.
    const removeExitHook = installExitHooks(() => responder.stop());
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
          // Only a key whose Pair-Setup signature was checked is worth pinning.
          ...(outcome.peer.publicKey && outcome.peer.signature && outcome.peer.identifier
            ? { peerPublicKey: outcome.peer.publicKey, peerIdentifier: outcome.peer.identifier }
            : {}),
          pairedAt: new Date().toISOString(),
        },
        stateDir
      );
      return record;
    } finally {
      clearTimeout(timer);
      clearInterval(superseded);
      removeExitHook();
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
