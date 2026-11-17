// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// Finding the iPhone's RemotePairing listener: Bonjour on the LAN, a saved host:port, or a
// bounded port scan on any routable address (for example a tailnet IP).
import net from 'net';

import { computeAuthTag } from './crypto';
import {
  HostAddress,
  REMOTEPAIRING_SERVICE,
  ServiceInstance,
  TxtProperties,
  browse,
  localAddresses,
} from './mdns';
import { PacketReader, probeFrame } from './rppairing';
import type { DeviceRecord } from './store';

/** The device info returned by a successful probe, optionally enriched by LAN discovery. */
export interface ProbeResult {
  host: string;
  port: number;
  peer: Record<string, unknown>;
  wireProtocolVersion: number | undefined;
  instance?: string;
  txt?: TxtProperties;
  matches?: boolean;
  reachable?: boolean;
}

/** An advertisement that had no resolvable address. */
export interface UnreachableAdvertisement {
  instance: string;
  host: string | undefined;
  port: number | undefined;
  txt: TxtProperties;
  matches: boolean;
  reachable: false;
}

export type LanDiscoveryResult = ProbeResult | UnreachableAdvertisement;

/**
 * A paired iPhone advertises `_remotepairing._tcp` with TXT identifier + authTag, where
 * authTag = SipHash-2-4(peer altIRK, identifier). We hold the phone's altIRK from Pair-Setup, so a
 * saved record can be matched to an advertisement without opening a connection.
 */
export function advertisementMatchesRecord(
  txt: TxtProperties | null | undefined,
  record: Pick<DeviceRecord, 'peerAltIrk'> | null | undefined
): boolean {
  if (!txt?.identifier || !txt?.authTag || !record?.peerAltIrk || record.peerAltIrk.length !== 16) {
    return false;
  }
  return computeAuthTag(record.peerAltIrk, txt.identifier).toString('base64') === txt.authTag;
}

/**
 * Connect, send a non-pairing handshake, and return the device's peerDeviceInfo if this is a
 * RemotePairing listener. Resolves null on any failure.
 */
export function probe(
  host: string,
  port: number,
  { timeoutMs = 1000 }: { timeoutMs?: number } = {}
): Promise<ProbeResult | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: ProbeResult | null) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        socket.destroy();
        resolve(value);
      }
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    const socket = net.connect({ host, port });
    socket.once('error', () => finish(null));
    socket.once('connect', () => {
      const reader = new PacketReader(socket);
      reader.next(timeoutMs).then(
        (envelope) => {
          const info = envelope?.message?.plain?._0?.response?._1?.handshake?._0;
          finish(
            info
              ? {
                  host,
                  port,
                  peer: info.peerDeviceInfo || {},
                  wireProtocolVersion: info.wireProtocolVersion,
                }
              : null
          );
        },
        () => finish(null)
      );
      socket.write(probeFrame());
    });
  });
}

export interface ScanPortsOptions {
  ports?: Iterable<number> | null;
  concurrency?: number;
  timeoutMs?: number;
  onProgress?: (done: number) => void;
}

/**
 * Browse Bonjour for RemotePairing listeners. Resolves [{ host, port, peer, txt, instance, matches }]
 * where `matches` is true when `record` (optional) identifies that phone via its authTag.
 * Stops early as soon as the matching phone answers a probe.
 */
export async function discoverOnLan({
  timeoutMs = 5000,
  record = null,
}: {
  timeoutMs?: number;
  record?: Pick<DeviceRecord, 'peerAltIrk'> | null;
} = {}): Promise<LanDiscoveryResult[]> {
  const results: ProbeResult[] = [];
  const seen = new Set<string>();
  let stopEarly: (result: ProbeResult) => void = () => {};
  const early = new Promise<ProbeResult>((resolve) => {
    stopEarly = resolve;
  });
  const probes: Promise<void>[] = [];
  const unreachable: UnreachableAdvertisement[] = [];
  const consider = (instance: ServiceInstance) => {
    const matches = record ? advertisementMatchesRecord(instance.txt, record) : false;
    if (!instance.addresses.length && !seen.has(instance.instance)) {
      seen.add(instance.instance);
      unreachable.push({
        instance: instance.instance,
        host: instance.host,
        port: instance.port,
        txt: instance.txt,
        matches,
        reachable: false,
      });
    }
    for (const { address } of prioritise(instance.addresses)) {
      const key = `${address}:${instance.port}`;
      if (seen.has(key)) continue;
      seen.add(key);
      probes.push(
        probe(address, instance.port as number, { timeoutMs: 1500 }).then((result) => {
          if (!result) return;
          Object.assign(result, { instance: instance.instance, txt: instance.txt, matches });
          results.push(result);
          if (matches) stopEarly(result);
        })
      );
    }
  };
  const browsing = browse(REMOTEPAIRING_SERVICE, {
    timeout: timeoutMs,
    onInstance: consider,
  });
  const winner = await Promise.race([early, browsing.then(() => null)]);
  if (!winner) {
    const instances = await browsing;
    instances.forEach(consider);
    await Promise.all(probes);
  }
  for (const entry of results) entry.reachable = true;
  return [
    ...results,
    ...unreachable.filter((entry) => !results.some((r) => r.instance === entry.instance)),
  ];
}

/** IPv4 first, then routable IPv6, then link-local IPv6 (needs a scope id). */
function prioritise(addresses: HostAddress[]): HostAddress[] {
  const rank = (entry: HostAddress): number => {
    if (entry.family === 4) return 0;
    if (!entry.address.startsWith('fe80:')) return 1;
    return entry.address.includes('%') ? 2 : 3;
  };
  return [...addresses].sort((a, b) => rank(a) - rank(b));
}

export interface SweepLocalSubnetsOptions {
  ports?: number[];
  timeoutMs?: number;
  concurrency?: number;
  exclude?: Set<string>;
}

/**
 * Fallback when Bonjour finds nothing: probe port(s) on every host of each local IPv4 /24.
 * Cheap (a few hundred connects) and finds a phone whose mDNS is filtered by the network.
 */
export async function sweepLocalSubnets({
  ports = [49152],
  timeoutMs = 700,
  concurrency = 64,
  exclude = new Set(),
}: SweepLocalSubnetsOptions = {}): Promise<ProbeResult[]> {
  const targets: { host: string; port: number }[] = [];
  for (const { address } of localAddresses().filter((entry) => entry.family === 4)) {
    const base = address.split('.').slice(0, 3).join('.');
    for (let host = 1; host < 255; host += 1) {
      const candidate = `${base}.${host}`;
      if (candidate === address || exclude.has(candidate)) continue;
      for (const port of ports) targets.push({ host: candidate, port });
    }
  }
  const found: ProbeResult[] = [];
  const queue = [...targets];
  const worker = async () => {
    while (queue.length) {
      const { host, port } = queue.shift()!;
      const result = await probe(host, port, { timeoutMs });
      if (result) found.push(result);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return found;
}
