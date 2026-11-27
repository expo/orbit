// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// Finding the iPhone's RemotePairing listener: Bonjour on the LAN or a saved host:port.
import net from 'net';

import { computeAuthTag } from './crypto';
import { HostAddress, REMOTEPAIRING_SERVICE, ServiceInstance, TxtProperties, browse } from './mdns';
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

/**
 * Browse Bonjour for RemotePairing listeners. Resolves [{ host, port, peer, txt, instance, matches }]
 * where `matches` is true when one of `records` identifies that phone via its authTag.
 * Stops as soon as every record's phone answered a probe, or when `signal` aborts.
 */
export async function discoverOnLan({
  timeoutMs = 5000,
  records = [],
  signal,
  systemFallback,
}: {
  timeoutMs?: number;
  records?: Pick<DeviceRecord, 'peerAltIrk'>[];
  signal?: AbortSignal;
  systemFallback?: boolean;
} = {}): Promise<LanDiscoveryResult[]> {
  const results: ProbeResult[] = [];
  const seen = new Set<string>();
  const found = new Set<Pick<DeviceRecord, 'peerAltIrk'>>();
  const stop = new AbortController();
  if (signal?.aborted) stop.abort();
  else signal?.addEventListener('abort', () => stop.abort(), { once: true });
  const probes: Promise<void>[] = [];
  const unreachable: UnreachableAdvertisement[] = [];
  const consider = (instance: ServiceInstance) => {
    const matching = records.filter((record) => advertisementMatchesRecord(instance.txt, record));
    const matches = matching.length > 0;
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
          for (const record of matching) found.add(record);
          if (records.length && found.size === records.length) stop.abort();
        })
      );
    }
  };
  const instances = await browse(REMOTEPAIRING_SERVICE, {
    timeout: timeoutMs,
    onInstance: consider,
    signal: stop.signal,
    systemFallback,
  });
  if (!stop.signal.aborted) {
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
