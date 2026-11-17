// Adapted from remote-device (MIT, https://github.com/expo/appdrop).
// DNS-SD for Remote Device Pairing: advertise this computer as a pairable host, and browse for
// paired iPhones. Multicast DNS itself is handled by `multicast-dns`.
//
// On macOS we advertise through the system mDNSResponder (`dns-sd`): Local Network privacy can
// silently drop a process's own multicast, and the system responder is exempt. Windows and Linux
// share UDP 5353 with Bonjour / Avahi / the Windows DNS client through SO_REUSEADDR.
import { ChildProcess, execFile, spawn } from 'child_process';
import debug from 'debug';
import dns from 'dns';
import makeMdns from 'multicast-dns';
import os from 'os';

const log = debug('expo:remote-pairing:mdns');

export const PAIRABLE_HOST_SERVICE = '_remotepairing-pairable-host._tcp.local';
export const REMOTEPAIRING_SERVICE = '_remotepairing._tcp.local';

export type TxtProperties = Record<string, string>;

export interface HostAddress {
  family: number;
  address: string;
}

export interface ServiceInstance {
  instance: string;
  host?: string;
  port?: number;
  addresses: HostAddress[];
  txt: TxtProperties;
}

export interface AdvertiseOptions {
  serviceType: string;
  instanceName: string;
  port: number;
  txt: TxtProperties;
}

export interface Advertisement {
  stop(): void;
  backend: 'system' | 'multicast';
}

/** Usable non-loopback, non-link-local local addresses. */
export function localAddresses(): HostAddress[] {
  const result: HostAddress[] = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.internal) continue;
      if (entry.family === 'IPv4' || (entry.family as unknown) === 4) {
        if (entry.address.startsWith('169.254.')) continue;
        result.push({ family: 4, address: entry.address });
      } else if (!entry.address.startsWith('fe80:')) {
        result.push({ family: 6, address: entry.address });
      }
    }
  }
  return result;
}

function encodeTxt(txt: TxtProperties): Buffer[] {
  return Object.entries(txt).map(([key, value]) => Buffer.from(`${key}=${value}`));
}

function decodeTxt(data: unknown): TxtProperties {
  const txt: TxtProperties = {};
  for (const entry of Array.isArray(data) ? data : [data]) {
    const text = Buffer.isBuffer(entry) ? entry.toString('utf8') : String(entry ?? '');
    const eq = text.indexOf('=');
    if (eq > 0) txt[text.slice(0, eq)] = text.slice(eq + 1);
  }
  return txt;
}

/** Answer queries for one service instance and announce it. */
function advertiseWithMulticast({
  serviceType,
  instanceName,
  port,
  txt,
}: AdvertiseOptions): Advertisement {
  const mdns = makeMdns({ reuseAddr: true });
  const instance = `${instanceName}.${serviceType}`;
  const hostname = `${os.hostname().replace(/\.local\.?$/i, '')}.local`;
  const answers = () => [
    { name: serviceType, type: 'PTR' as const, ttl: 120, data: instance },
    { name: instance, type: 'SRV' as const, ttl: 120, data: { port, target: hostname } },
    { name: instance, type: 'TXT' as const, ttl: 120, data: encodeTxt(txt) },
    ...localAddresses().map(({ family, address }) => ({
      name: hostname,
      type: family === 4 ? ('A' as const) : ('AAAA' as const),
      ttl: 120,
      data: address,
    })),
  ];
  const names = new Set([serviceType, instance, hostname].map((name) => name.toLowerCase()));
  mdns.on('query', (query) => {
    if (query.questions.some((question) => names.has(question.name.toLowerCase()))) {
      mdns.respond(answers());
    }
  });
  mdns.on('error', (error) => log('mDNS responder error: %O', error));
  // Announce right away, and again shortly after, as RFC 6762 suggests.
  mdns.respond(answers());
  const reannounce = setTimeout(() => mdns.respond(answers()), 1000);
  return {
    stop: () => {
      clearTimeout(reannounce);
      mdns.destroy();
    },
    backend: 'multicast',
  };
}

/**
 * Advertise through the operating system's own mDNS responder (macOS). A process that was never
 * granted Local Network access has its multicast silently dropped; mDNSResponder is exempt.
 */
function advertiseWithDnsSd({
  serviceType,
  instanceName,
  port,
  txt,
}: AdvertiseOptions): Promise<Advertisement> {
  const args = [
    '-R',
    instanceName,
    serviceType.replace(/\.local\.?$/, ''),
    'local',
    String(port),
    ...Object.entries(txt).map(([key, value]) => `${key}=${value}`),
  ];
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn('dns-sd', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let registered = false;
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('dns-sd did not confirm the registration'));
    }, 8000);
    child.stdout!.on('data', (chunk: Buffer) => {
      output += chunk.toString();
      if (!registered && /registered and active/i.test(output)) {
        registered = true;
        clearTimeout(timer);
        resolve({ stop: () => child.kill(), backend: 'system' });
      }
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (!registered) reject(new Error(`dns-sd exited with code ${code}`));
    });
  });
}

/** Advertise a service, preferring the system responder on macOS. */
export async function startAdvertising(options: AdvertiseOptions): Promise<Advertisement> {
  if (process.platform === 'darwin') {
    await stopStaleRegistrations(options.instanceName);
    try {
      return await advertiseWithDnsSd(options);
    } catch (error) {
      log('System responder unavailable, using multicast: %O', error);
    }
  }
  return advertiseWithMulticast(options);
}

/**
 * Kill `dns-sd` registrations left behind for the same instance by a killed process: the system
 * responder would rename the next registration instead, and the phone would list both.
 */
function stopStaleRegistrations(instanceName: string): Promise<void> {
  return new Promise((resolve) => {
    execFile('pgrep', ['-f', `dns-sd -R ${instanceName}`], (_error, stdout) => {
      for (const pid of (stdout || '').split('\n').map((line) => Number(line.trim()))) {
        if (!pid || pid === process.pid) continue;
        try {
          process.kill(pid, 'SIGTERM');
        } catch {}
      }
      resolve();
    });
  });
}

/**
 * Browse for instances of `serviceType` for `timeout` ms. `onInstance` fires as soon as an
 * instance's address is known; the promise resolves every instance found.
 */
export async function browse(
  serviceType: string,
  {
    timeout = 3000,
    onInstance,
  }: { timeout?: number; onInstance?: (i: ServiceInstance) => void } = {}
): Promise<ServiceInstance[]> {
  const instances = new Map<string, Omit<ServiceInstance, 'addresses'>>();
  const hosts = new Map<string, HostAddress[]>();
  const notified = new Set<string>();
  const queriedHosts = new Set<string>();
  const mdns = makeMdns({ reuseAddr: true });
  mdns.on('error', (error) => log('mDNS browser error: %O', error));

  const entry = (name: string) => {
    const existing = instances.get(name) ?? { instance: name, txt: {} };
    instances.set(name, existing);
    return existing;
  };
  const assemble = (): ServiceInstance[] =>
    [...instances.values()]
      .filter((instance) => instance.port)
      .map((instance) => ({
        ...instance,
        addresses: (instance.host && hosts.get(instance.host)) || [],
      }));

  mdns.on('response', (response) => {
    for (const record of [...response.answers, ...(response.additionals ?? [])]) {
      if (record.type === 'PTR' && record.name === serviceType) {
        entry(record.data);
      } else if (record.type === 'SRV' && record.name.endsWith(serviceType)) {
        const instance = entry(record.name);
        instance.host = record.data.target;
        instance.port = record.data.port;
        if (!hosts.has(instance.host) && !queriedHosts.has(instance.host)) {
          queriedHosts.add(instance.host);
          mdns.query([
            { name: instance.host, type: 'A' },
            { name: instance.host, type: 'AAAA' },
          ]);
        }
      } else if (record.type === 'TXT' && record.name.endsWith(serviceType)) {
        const instance = entry(record.name);
        instance.txt = { ...instance.txt, ...decodeTxt(record.data) };
      } else if (record.type === 'A' || record.type === 'AAAA') {
        const list = hosts.get(record.name) ?? [];
        if (!list.some((item) => item.address === record.data)) {
          list.push({ family: record.type === 'A' ? 4 : 6, address: record.data });
        }
        hosts.set(record.name, list);
      }
    }
    for (const instance of assemble()) {
      if (instance.addresses.length && !notified.has(instance.instance)) {
        notified.add(instance.instance);
        onInstance?.(instance);
      }
    }
  });

  const query = () => mdns.query([{ name: serviceType, type: 'PTR' }]);
  query();
  const requery = setInterval(query, 1000);
  await new Promise((resolve) => setTimeout(resolve, timeout));
  clearInterval(requery);
  mdns.destroy();

  if (instances.size === 0 && process.platform === 'darwin') {
    // Our own multicast may be blocked by Local Network privacy; ask mDNSResponder instead.
    for (const instance of await browseWithDnsSd(serviceType)) {
      instances.set(instance.instance, instance);
    }
  }
  // Resolve hosts whose addresses never showed up over multicast.
  await Promise.all(
    [...instances.values()]
      .filter((instance) => instance.host && !hosts.get(instance.host)?.length)
      .map(async ({ host }) => {
        try {
          const resolved = await dns.promises.lookup(host!.replace(/\.$/, ''), { all: true });
          hosts.set(
            host!,
            resolved.map(({ family, address }) => ({ family, address }))
          );
        } catch {}
      })
  );
  const result = assemble();
  for (const instance of result) {
    if (instance.addresses.length && !notified.has(instance.instance)) onInstance?.(instance);
  }
  return result;
}

function runDnsSd(args: string[], timeoutMs = 2500): Promise<string> {
  return new Promise((resolve) => {
    const child = execFile(
      'dns-sd',
      args,
      { timeout: timeoutMs, killSignal: 'SIGINT' },
      (_error, stdout) => resolve(stdout || '')
    );
    child.on('error', () => resolve(''));
  });
}

/** Browse and resolve through the system's mDNSResponder (macOS). */
async function browseWithDnsSd(serviceType: string): Promise<Omit<ServiceInstance, 'addresses'>[]> {
  const type = serviceType.replace(/\.local\.?$/, '');
  const names = new Set<string>();
  for (const line of (await runDnsSd(['-B', type, 'local.'])).split('\n')) {
    const match = line.match(/\sAdd\s+\d+\s+\d+\s+local\.\s+\S+\s+(.+?)\s*$/);
    if (match) names.add(match[1].trim());
  }
  const results: Omit<ServiceInstance, 'addresses'>[] = [];
  for (const name of names) {
    const lookup = await runDnsSd(['-L', name, type, 'local.']);
    const reach = lookup.match(/can be reached at (\S+?):(\d+)/);
    const txtLine = lookup.split('\n').find((line) => /^\s+[A-Za-z0-9_-]+=/.test(line)) || '';
    const txt: TxtProperties = {};
    for (const part of txtLine.trim().split(/(?<!\\)\s+/)) {
      const eq = part.indexOf('=');
      if (eq > 0) txt[part.slice(0, eq)] = part.slice(eq + 1).replace(/\\ /g, ' ');
    }
    results.push({
      instance: `${name}.${serviceType}`,
      host: reach?.[1],
      port: reach ? Number(reach[2]) : undefined,
      txt,
    });
  }
  return results;
}
