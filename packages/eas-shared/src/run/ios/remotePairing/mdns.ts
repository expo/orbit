// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// Minimal mDNS/DNS-SD: message codec, a responder that advertises one service instance, and a
// browser that resolves instances of a service type. Node built-ins only.
//
// Backends: on macOS we prefer the system mDNSResponder (through `dns-sd`), since Local Network
// privacy can silently drop our own multicast. On Windows and Linux (and as a macOS fallback) we
// speak multicast DNS ourselves over UDP 5353, sharing the port with Bonjour / Avahi / the
// Windows DNS client through SO_REUSEADDR.
import { ChildProcess, execFile, spawn } from 'child_process';
import dgram from 'dgram';
import dns from 'dns';
import { EventEmitter } from 'events';
import os from 'os';

const DEBUG = !!process.env.REMOTE_DEVICE_DEBUG;
const debug = (...args: unknown[]): void => {
  if (DEBUG) console.error('[mdns]', ...args);
};

const IS_WINDOWS = process.platform === 'win32';

export const MDNS_PORT = 5353;
export const MDNS_V4 = '224.0.0.251';
export const MDNS_V6 = 'ff02::fb';
export const QTYPE = Object.freeze({ A: 1, PTR: 12, TXT: 16, AAAA: 28, SRV: 33, ANY: 255 });
export const PAIRABLE_HOST_SERVICE = '_remotepairing-pairable-host._tcp.local.';
export const REMOTEPAIRING_SERVICE = '_remotepairing._tcp.local.';

const CLASS_IN = 1;
const CACHE_FLUSH = 0x8000;

export type TxtProperties = Record<string, string>;

export interface MdnsQuestion {
  name: string;
  type: number;
  unicast?: boolean;
}

export interface ParsedQuestion {
  name: string;
  type: number;
  unicast: boolean;
}

export interface MdnsRecord {
  name: string;
  type: number;
  ttl: number;
  /** PTR / SRV target. */
  target?: string;
  priority?: number;
  weight?: number;
  port?: number;
  txt?: TxtProperties;
  /** A / AAAA address. */
  address?: string;
  /** Raw rdata for record types we don't decode. */
  rdata?: Buffer;
}

export interface ParsedMessage {
  isResponse: boolean;
  questions: ParsedQuestion[];
  records: MdnsRecord[];
}

export interface RecordInput {
  name: string;
  type: number;
  rdata: Buffer;
  ttl?: number;
  flush?: boolean;
}

export interface MessageInput {
  id?: number;
  flags?: number;
  questions?: MdnsQuestion[];
  answers?: Buffer[];
  additionals?: Buffer[];
}

export interface HostAddress {
  family: number;
  address: string;
}

export interface LocalAddress extends HostAddress {
  interface: string;
  scopeid?: number;
}

export interface ServiceInstance {
  instance: string;
  host?: string;
  port?: number;
  addresses: HostAddress[];
  txt: TxtProperties;
}

/** An instance as discovered before its host addresses are known. */
export type UnresolvedInstance = Omit<ServiceInstance, 'addresses'>;

export interface AdvertiseOptions {
  serviceType: string;
  instanceName: string;
  port: number;
  txt: TxtProperties;
  hostname?: string;
  addresses?: HostAddress[];
  ttl?: number;
  unicastTargets?: string[];
}

export interface Advertisement {
  stop(): void;
  backend: 'system' | 'multicast';
}

export interface BrowseOptions {
  timeout?: number;
  onInstance?: (instance: ServiceInstance) => void;
}

interface FamilySocket {
  family: 4 | 6;
  socket: dgram.Socket;
}

interface SendTarget {
  address: string;
  port: number;
  family: 4 | 6;
}

type MessageHandler = (data: Buffer, remote: dgram.RemoteInfo) => void;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// Node 18.0-18.3 briefly reported address families as numbers.
const isV6Family = (family: string | number): boolean => family === 'IPv6' || family === 6;
const isV4Family = (family: string | number): boolean => family === 'IPv4' || family === 4;

export function encodeName(name: string): Buffer {
  const parts: Buffer[] = [];
  for (const label of name.replace(/\.$/, '').split('.')) {
    if (!label) continue;
    const bytes = Buffer.from(label, 'utf8');
    if (bytes.length > 63) throw new Error(`mDNS label too long: ${label}`);
    parts.push(Buffer.from([bytes.length]), bytes);
  }
  parts.push(Buffer.from([0]));
  return Buffer.concat(parts);
}

export function decodeName(buffer: Buffer, offset: number): { name: string; offset: number } {
  const labels: string[] = [];
  let jumped = false;
  let end = offset;
  let hops = 0;
  for (;;) {
    if (offset >= buffer.length) throw new Error('truncated name');
    const length = buffer[offset];
    if (length === 0) {
      offset += 1;
      break;
    }
    if ((length & 0xc0) === 0xc0) {
      if (offset + 1 >= buffer.length) throw new Error('truncated pointer');
      const pointer = ((length & 0x3f) << 8) | buffer[offset + 1];
      if (!jumped) end = offset + 2;
      jumped = true;
      offset = pointer;
      if (++hops > 64) throw new Error('name pointer loop');
      continue;
    }
    labels.push(buffer.subarray(offset + 1, offset + 1 + length).toString('utf8'));
    offset += 1 + length;
  }
  if (!jumped) end = offset;
  return { name: labels.join('.') + '.', offset: end };
}

export function encodeTxt(properties: TxtProperties): Buffer {
  const entries = Object.entries(properties);
  if (entries.length === 0) return Buffer.from([0]);
  const chunks: Buffer[] = [];
  for (const [key, value] of entries) {
    const bytes = Buffer.from(`${key}=${value}`, 'utf8');
    if (bytes.length > 255) throw new Error(`TXT entry too long: ${key}`);
    chunks.push(Buffer.from([bytes.length]), bytes);
  }
  return Buffer.concat(chunks);
}

export function decodeTxt(rdata: Buffer): TxtProperties {
  const result: TxtProperties = {};
  let offset = 0;
  while (offset < rdata.length) {
    const length = rdata[offset];
    const entry = rdata.subarray(offset + 1, offset + 1 + length).toString('utf8');
    offset += 1 + length;
    if (!entry) continue;
    const separator = entry.indexOf('=');
    if (separator < 0) result[entry] = '';
    else result[entry.slice(0, separator)] = entry.slice(separator + 1);
  }
  return result;
}

export function encodeRecord({ name, type, rdata, ttl = 120, flush = false }: RecordInput): Buffer {
  const header = Buffer.alloc(10);
  header.writeUInt16BE(type, 0);
  header.writeUInt16BE(CLASS_IN | (flush ? CACHE_FLUSH : 0), 2);
  header.writeUInt32BE(ttl, 4);
  header.writeUInt16BE(rdata.length, 8);
  return Buffer.concat([encodeName(name), header, rdata]);
}

export function encodeSrv(port: number, target: string, priority = 0, weight = 0): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16BE(priority, 0);
  header.writeUInt16BE(weight, 2);
  header.writeUInt16BE(port, 4);
  return Buffer.concat([header, encodeName(target)]);
}

export function ipToBytes(address: string): Buffer {
  if (address.includes(':')) {
    const clean = address.split('%')[0];
    const halves = clean.split('::');
    const head = halves[0] ? halves[0].split(':') : [];
    const tail = halves.length > 1 && halves[1] ? halves[1].split(':') : [];
    const groups = [...head, ...Array<string>(8 - head.length - tail.length).fill('0'), ...tail];
    const bytes = Buffer.alloc(16);
    groups.forEach((group, index) => bytes.writeUInt16BE(parseInt(group || '0', 16), index * 2));
    return bytes;
  }
  return Buffer.from(address.split('.').map(Number));
}

export function bytesToIp(bytes: Buffer): string {
  if (bytes.length === 4) return [...bytes].join('.');
  const groups: string[] = [];
  for (let i = 0; i < 16; i += 2) groups.push(bytes.readUInt16BE(i).toString(16));
  const text = groups.join(':');
  // Compress the longest run of zero groups.
  const runs = text.match(/(^|:)(0(:0)+)(:|$)/g);
  if (!runs) return text;
  const longest = runs.sort((a, b) => b.length - a.length)[0];
  return text.replace(longest, '::').replace(/:::/, '::');
}

export function buildMessage({
  id = 0,
  flags = 0x8400,
  questions = [],
  answers = [],
  additionals = [],
}: MessageInput): Buffer {
  const header = Buffer.alloc(12);
  header.writeUInt16BE(id, 0);
  header.writeUInt16BE(flags, 2);
  header.writeUInt16BE(questions.length, 4);
  header.writeUInt16BE(answers.length, 6);
  header.writeUInt16BE(0, 8);
  header.writeUInt16BE(additionals.length, 10);
  const questionBytes = questions.map(({ name, type, unicast = false }) => {
    const tail = Buffer.alloc(4);
    tail.writeUInt16BE(type, 0);
    tail.writeUInt16BE(CLASS_IN | (unicast ? 0x8000 : 0), 2);
    return Buffer.concat([encodeName(name), tail]);
  });
  return Buffer.concat([header, ...questionBytes, ...answers, ...additionals]);
}

export function parseMessage(buffer: Buffer): ParsedMessage {
  if (buffer.length < 12) throw new Error('mDNS message too short');
  const flags = buffer.readUInt16BE(2);
  const counts = [4, 6, 8, 10].map((at) => buffer.readUInt16BE(at));
  let offset = 12;
  const questions: ParsedQuestion[] = [];
  for (let i = 0; i < counts[0]; i += 1) {
    const decoded = decodeName(buffer, offset);
    offset = decoded.offset;
    questions.push({
      name: decoded.name,
      type: buffer.readUInt16BE(offset),
      unicast: !!(buffer.readUInt16BE(offset + 2) & 0x8000),
    });
    offset += 4;
  }
  const records: MdnsRecord[] = [];
  const total = counts[1] + counts[2] + counts[3];
  for (let i = 0; i < total; i += 1) {
    const decoded = decodeName(buffer, offset);
    offset = decoded.offset;
    const type = buffer.readUInt16BE(offset);
    const ttl = buffer.readUInt32BE(offset + 4);
    const rdlength = buffer.readUInt16BE(offset + 8);
    const rdataOffset = offset + 10;
    const rdata = buffer.subarray(rdataOffset, rdataOffset + rdlength);
    offset = rdataOffset + rdlength;
    const record: MdnsRecord = { name: decoded.name, type, ttl };
    if (type === QTYPE.PTR) {
      record.target = decodeName(buffer, rdataOffset).name;
    } else if (type === QTYPE.SRV && rdlength >= 6) {
      record.priority = rdata.readUInt16BE(0);
      record.weight = rdata.readUInt16BE(2);
      record.port = rdata.readUInt16BE(4);
      record.target = decodeName(buffer, rdataOffset + 6).name;
    } else if (type === QTYPE.TXT) {
      record.txt = decodeTxt(rdata);
    } else if ((type === QTYPE.A && rdlength === 4) || (type === QTYPE.AAAA && rdlength === 16)) {
      record.address = bytesToIp(rdata);
    } else {
      record.rdata = Buffer.from(rdata);
    }
    records.push(record);
  }
  return { isResponse: !!(flags & 0x8000), questions, records };
}

/** Usable non-loopback local addresses as [{ family, address, interface }]. */
export function localAddresses({ includeLinkLocalV6 = false } = {}): LocalAddress[] {
  const result: LocalAddress[] = [];
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.internal) continue;
      const family = entry.family as string | number;
      if (isV4Family(family)) {
        if (entry.address.startsWith('169.254.')) continue;
        result.push({ family: 4, address: entry.address, interface: name });
      } else if (isV6Family(family)) {
        if (entry.address.startsWith('fe80:') && !includeLinkLocalV6) continue;
        result.push({
          family: 6,
          address: entry.address,
          interface: name,
          scopeid: (entry as os.NetworkInterfaceInfoIPv6).scopeid,
        });
      }
    }
  }
  return result;
}

/**
 * IPv6 zone identifiers for every interface, as `[interfaceName, zone]`. POSIX systems accept the
 * interface name as the zone (`::%en0`); Windows only accepts the numeric interface index
 * (`::%12`), which Node exposes as the IPv6 entries' `scopeid`.
 */
function ipv6Zones(): [string, string][] {
  const zones: [string, string][] = [];
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    if (!IS_WINDOWS) {
      zones.push([name, name]);
      continue;
    }
    const v6 = (entries || []).find(
      (entry): entry is os.NetworkInterfaceInfoIPv6 =>
        isV6Family(entry.family as string | number) &&
        !!(entry as os.NetworkInterfaceInfoIPv6).scopeid
    );
    if (v6) zones.push([name, String(v6.scopeid)]);
  }
  return zones;
}

function openSocket(family: 4 | 6, onMessage: MessageHandler): Promise<dgram.Socket> {
  return new Promise((resolve, reject) => {
    // reuseAddr also sets SO_REUSEPORT on macOS/BSD, which is what lets us share 5353 with the
    // system mDNS responder. Node's explicit reusePort option is not supported there. On Windows
    // and Linux it sets SO_REUSEADDR, which Bonjour, Avahi and the Windows DNS client also use,
    // so binding alongside them works.
    const socket = dgram.createSocket({ type: family === 4 ? 'udp4' : 'udp6', reuseAddr: true });
    let settled = false;
    const fail = (error: unknown): void => {
      if (!settled) {
        settled = true;
        try {
          socket.close();
        } catch {}
        reject(error);
      }
    };
    socket.on('error', fail);
    socket.on('message', onMessage);
    socket.bind(MDNS_PORT, family === 4 ? '0.0.0.0' : '::', () => {
      try {
        socket.setMulticastTTL(255);
        socket.setMulticastLoopback(true);
        let joined = 0;
        if (family === 4) {
          const v4 = localAddresses().filter((entry) => entry.family === 4);
          for (const { address, interface: name } of v4) {
            try {
              socket.addMembership(MDNS_V4, address);
              joined += 1;
              debug(`joined ${MDNS_V4} via ${name} ${address}`);
            } catch (error) {
              debug(`join ${MDNS_V4} via ${name} ${address} failed: ${errorMessage(error)}`);
            }
          }
          if (!joined) socket.addMembership(MDNS_V4);
        } else {
          for (const [name, zone] of ipv6Zones()) {
            try {
              socket.addMembership(MDNS_V6, `::%${zone}`);
              joined += 1;
              debug(`joined ${MDNS_V6} on ${name}`);
            } catch {}
          }
          if (!joined) throw new Error('no IPv6 interface accepted the mDNS group');
        }
      } catch (error) {
        fail(error);
        return;
      }
      settled = true;
      resolve(socket);
    });
  });
}

async function openSockets(onMessage: MessageHandler): Promise<FamilySocket[]> {
  const sockets: FamilySocket[] = [];
  try {
    sockets.push({ family: 4, socket: await openSocket(4, onMessage) });
  } catch {}
  try {
    sockets.push({ family: 6, socket: await openSocket(6, onMessage) });
  } catch {}
  if (sockets.length === 0) throw new Error('could not open an mDNS socket on UDP 5353');
  return sockets;
}

function sendToAll(
  sockets: FamilySocket[],
  packet: Buffer,
  target: SendTarget | null = null
): void {
  for (const { family, socket } of sockets) {
    if (target && target.family !== family) continue;
    if (target) {
      socket.send(packet, target.port, target.address, () => {});
      continue;
    }
    if (family === 4) {
      const addresses = localAddresses().filter((entry) => entry.family === 4);
      if (addresses.length === 0) socket.send(packet, MDNS_PORT, MDNS_V4, () => {});
      for (const { address } of addresses) {
        try {
          socket.setMulticastInterface(address);
        } catch {}
        socket.send(packet, MDNS_PORT, MDNS_V4, () => {});
      }
    } else {
      for (const [, zone] of ipv6Zones()) {
        try {
          socket.setMulticastInterface(`::%${zone}`);
        } catch {
          continue;
        }
        socket.send(packet, MDNS_PORT, `${MDNS_V6}%${zone}`, () => {});
      }
    }
  }
}

/**
 * Advertise one DNS-SD service instance and answer queries for it.
 * Emits "query" with the querier's address whenever a matching question arrives.
 */
export class Responder extends EventEmitter {
  readonly serviceType: string;
  readonly instanceName: string;
  readonly instanceFqdn: string;
  readonly port: number;
  readonly txt: TxtProperties;
  readonly hostname: string;
  readonly addresses: HostAddress[];
  readonly ttl: number;
  readonly unicastTargets: string[];
  sockets: FamilySocket[];
  private announceTimer?: NodeJS.Timeout;
  private refreshTimer?: NodeJS.Timeout;

  constructor({
    serviceType,
    instanceName,
    port,
    txt,
    hostname,
    addresses,
    ttl = 120,
    unicastTargets = [],
  }: AdvertiseOptions) {
    super();
    this.serviceType = serviceType.endsWith('.') ? serviceType : `${serviceType}.`;
    this.instanceName = instanceName;
    this.instanceFqdn = `${instanceName}.${this.serviceType}`;
    this.port = port;
    this.txt = txt;
    this.hostname = (hostname || `${instanceName.split('.')[0]}.local`).replace(/\.?$/, '.');
    this.addresses = addresses || localAddresses();
    this.ttl = ttl;
    // Some networks drop multicast between wired and wireless clients. Announcing directly to a
    // known device's mDNS port reaches it anyway (mDNS implementations accept unicast on 5353).
    this.unicastTargets = unicastTargets;
    this.sockets = [];
  }

  records(ttl: number = this.ttl): { answers: Buffer[]; additionals: Buffer[] } {
    const answers = [
      encodeRecord({
        name: this.serviceType,
        type: QTYPE.PTR,
        rdata: encodeName(this.instanceFqdn),
        ttl,
      }),
      encodeRecord({
        name: this.instanceFqdn,
        type: QTYPE.SRV,
        rdata: encodeSrv(this.port, this.hostname),
        ttl,
        flush: true,
      }),
      encodeRecord({
        name: this.instanceFqdn,
        type: QTYPE.TXT,
        rdata: encodeTxt(this.txt),
        ttl,
        flush: true,
      }),
    ];
    const additionals =
      ttl === 0
        ? []
        : this.addresses.map(({ family, address }) =>
            encodeRecord({
              name: this.hostname,
              type: family === 4 ? QTYPE.A : QTYPE.AAAA,
              rdata: ipToBytes(address),
              ttl,
              flush: true,
            })
          );
    return { answers, additionals };
  }

  matches(name: string, type: number): boolean {
    if (name === this.serviceType) return type === QTYPE.PTR || type === QTYPE.ANY;
    if (name === this.instanceFqdn) {
      return type === QTYPE.SRV || type === QTYPE.TXT || type === QTYPE.ANY;
    }
    if (name === this.hostname) {
      return type === QTYPE.A || type === QTYPE.AAAA || type === QTYPE.ANY;
    }
    return false;
  }

  announce(ttl: number = this.ttl): void {
    const packet = buildMessage(this.records(ttl));
    sendToAll(this.sockets, packet);
    for (const address of this.unicastTargets) {
      const family = address.includes(':') ? 6 : 4;
      sendToAll(this.sockets, packet, { address, port: MDNS_PORT, family });
      debug(`announced directly to ${address}:${MDNS_PORT}`);
    }
  }

  async start(): Promise<this> {
    this.sockets = await openSockets((data, remote) => this.onMessage(data, remote));
    this.announce();
    this.announceTimer = setTimeout(() => this.announce(), 250);
    const refreshSeconds = this.unicastTargets.length ? 2 : Math.max(5, this.ttl / 2);
    this.refreshTimer = setInterval(() => this.announce(), refreshSeconds * 1000);
    return this;
  }

  onMessage(data: Buffer, remote: dgram.RemoteInfo): void {
    let message: ParsedMessage;
    try {
      message = parseMessage(data);
    } catch {
      return;
    }
    if (message.isResponse) return;
    const matching = message.questions.filter((question) =>
      this.matches(question.name, question.type)
    );
    if (DEBUG && message.questions.length) {
      const interesting = message.questions.filter((question) =>
        question.name.includes('remotepairing')
      );
      if (interesting.length) {
        const described = interesting
          .map((q) => `${q.name}#${q.type}${q.unicast ? ' QU' : ''}`)
          .join(' ');
        debug(`query from ${remote.address}: ${described}${matching.length ? ' (ours)' : ''}`);
      }
    }
    if (matching.length === 0) return;
    this.emit('query', remote, matching);
    const packet = buildMessage(this.records());
    // Answer on the multicast group AND straight back to the querier: on networks that drop
    // multicast between wired and wireless clients the direct reply is the one that lands.
    sendToAll(this.sockets, packet, null);
    sendToAll(this.sockets, packet, {
      address: remote.address,
      port: remote.port,
      family: isV6Family(remote.family as string | number) ? 6 : 4,
    });
    debug(`answered ${remote.address}:${remote.port} for ${matching.map((q) => q.name).join(' ')}`);
  }

  stop(): void {
    clearTimeout(this.announceTimer);
    clearInterval(this.refreshTimer);
    if (this.sockets.length) {
      try {
        this.announce(0);
      } catch {}
    }
    for (const { socket } of this.sockets) socket.close();
    this.sockets = [];
  }
}

/**
 * Browse for a service type for `timeout` ms. Resolves [{ instance, host, port, addresses, txt }].
 * `onInstance` is invoked as soon as an instance has an address, so callers can stop early.
 */
export async function browse(
  serviceType: string,
  { timeout = 3000, onInstance }: BrowseOptions = {}
): Promise<ServiceInstance[]> {
  const type = serviceType.endsWith('.') ? serviceType : `${serviceType}.`;
  const instances = new Map<string, UnresolvedInstance>();
  const hosts = new Map<string, HostAddress[]>();
  const seen = new Set<string>();
  const queriedHosts = new Set<string>();
  let sockets: FamilySocket[] = [];

  const assemble = (): ServiceInstance[] =>
    [...instances.values()]
      .filter((entry) => entry.port)
      .map((entry) => ({
        ...entry,
        addresses: (entry.host && hosts.get(entry.host)) || [],
      }));
  const notify = (): void => {
    if (!onInstance) return;
    for (const entry of assemble()) {
      if (entry.addresses.length && !seen.has(entry.instance)) {
        seen.add(entry.instance);
        onInstance(entry);
      }
    }
  };

  sockets = await openSockets((data, remote) => {
    let message: ParsedMessage;
    try {
      message = parseMessage(data);
    } catch {
      return;
    }
    if (!message.isResponse) return;
    if (DEBUG) {
      const relevant = message.records.filter(
        (r) =>
          (r.name || '').includes(type.slice(0, -1)) || r.type === QTYPE.A || r.type === QTYPE.AAAA
      );
      if (relevant.length) {
        const described = message.records.map((r) => `${r.type}:${r.name}`).join(' ');
        debug(`response from ${remote.address}: ${described}`);
      }
    }
    for (const record of message.records) {
      if (record.type === QTYPE.PTR && record.name === type) {
        const target = record.target!;
        if (!instances.has(target)) instances.set(target, { instance: target, txt: {} });
      } else if (record.type === QTYPE.SRV && record.name.endsWith(type)) {
        const entry = instances.get(record.name) || { instance: record.name, txt: {} };
        entry.host = record.target;
        entry.port = record.port;
        instances.set(record.name, entry);
        const target = record.target;
        if (target !== undefined && !hosts.has(target) && !queriedHosts.has(target)) {
          queriedHosts.add(target);
          sendToAll(
            sockets,
            buildMessage({
              flags: 0,
              questions: [
                { name: target, type: QTYPE.A },
                { name: target, type: QTYPE.AAAA },
              ],
            })
          );
        }
      } else if (record.type === QTYPE.TXT && record.name.endsWith(type)) {
        const entry = instances.get(record.name) || { instance: record.name, txt: {} };
        entry.txt = { ...entry.txt, ...record.txt };
        instances.set(record.name, entry);
      } else if ((record.type === QTYPE.A || record.type === QTYPE.AAAA) && record.address) {
        const list = hosts.get(record.name) || [];
        const address =
          record.type === QTYPE.AAAA &&
          record.address.startsWith('fe80:') &&
          isV6Family(remote.family as string | number) &&
          remote.address.includes('%')
            ? `${record.address}%${remote.address.split('%')[1]}`
            : record.address;
        if (!list.some((item) => item.address === address)) {
          list.push({ family: record.type === QTYPE.A ? 4 : 6, address });
        }
        hosts.set(record.name, list);
      }
    }
    notify();
  });

  const query = buildMessage({ flags: 0, questions: [{ name: type, type: QTYPE.PTR }] });
  sendToAll(sockets, query);
  const requery = setInterval(() => sendToAll(sockets, query), 1000);
  await new Promise((resolve) => setTimeout(resolve, timeout));
  clearInterval(requery);
  for (const { socket } of sockets) socket.close();
  if (instances.size === 0 && process.platform === 'darwin') {
    debug('no answers on our sockets; asking the system mDNSResponder via dns-sd');
    for (const entry of await browseWithDnsSd(type)) instances.set(entry.instance, entry);
  }
  await Promise.all(
    [...instances.values()]
      .filter((entry) => entry.host && !(hosts.get(entry.host) || []).length)
      .map(async (entry) => {
        const host = entry.host!;
        try {
          const resolved = await dns.promises.lookup(host.replace(/\.$/, ''), { all: true });
          hosts.set(
            host,
            resolved.map((r) => ({ family: r.family, address: r.address }))
          );
        } catch {}
      })
  );
  notify();
  return assemble();
}

function runDnsSd(args: string[], { timeoutMs = 2500 } = {}): Promise<string> {
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

/** macOS fallback: browse and resolve through the system's mDNSResponder. */
export async function browseWithDnsSd(type: string): Promise<UnresolvedInstance[]> {
  const browseOutput = await runDnsSd(['-B', type.replace(/\.local\.$/, ''), 'local.']);
  const names = new Set<string>();
  for (const line of browseOutput.split('\n')) {
    const match = line.match(/\sAdd\s+\d+\s+\d+\s+local\.\s+\S+\s+(.+?)\s*$/);
    if (match) names.add(match[1].trim());
  }
  debug(`dns-sd browse found ${names.size} instance(s)`);
  const results: UnresolvedInstance[] = [];
  for (const name of names) {
    const lookup = await runDnsSd(['-L', name, type.replace(/\.local\.$/, ''), 'local.']);
    const reach = lookup.match(/can be reached at (\S+?):(\d+)/);
    const txtLine = lookup.split('\n').find((line) => /^\s+[A-Za-z0-9_-]+=/.test(line)) || '';
    const txt: TxtProperties = {};
    for (const part of txtLine.trim().split(/(?<!\\)\s+/)) {
      const eq = part.indexOf('=');
      if (eq > 0) txt[part.slice(0, eq)] = part.slice(eq + 1).replace(/\\ /g, ' ');
    }
    results.push({
      instance: `${name}.${type}`,
      host: reach ? reach[1] : undefined,
      port: reach ? Number(reach[2]) : undefined,
      txt,
    });
  }
  return results;
}

/**
 * Advertise through the operating system's own mDNS responder.
 *
 * macOS gates multicast behind Local Network privacy: a process that was never granted it (an
 * `npx` run under an editor or agent, a launchd job) has its multicast silently dropped, so a
 * phone never sees our advertisement even though everything looks correct locally. The system
 * responder is exempt, always present on macOS, and speaks the same records — so prefer it and
 * keep our own implementation for everything else.
 */
export class SystemResponder {
  readonly serviceType: string;
  readonly instanceName: string;
  readonly port: number;
  readonly txt: TxtProperties;
  child: ChildProcess | null;

  constructor({ serviceType, instanceName, port, txt }: AdvertiseOptions) {
    this.serviceType = serviceType.replace(/\.local\.?$/, '');
    this.instanceName = instanceName;
    this.port = port;
    this.txt = txt;
    this.child = null;
  }

  start(): Promise<this> {
    // One registration per host, always under the same instance name: the phone keys its list on
    // that name, so republishing replaces the row instead of adding one. A leftover registration
    // from a killed run would otherwise be renamed by mDNSResponder ("... (2)") and show up as a
    // second device.
    const args = [
      '-R',
      this.instanceName,
      this.serviceType,
      'local',
      String(this.port),
      ...Object.entries(this.txt).map(([key, value]) => `${key}=${value}`),
    ];
    return new Promise((resolve, reject) => {
      const child = spawn('dns-sd', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let output = '';
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('dns-sd did not confirm the registration'));
      }, 8000);
      child.stdout.on('data', (chunk: Buffer) => {
        output += chunk.toString();
        if (/registered and active/i.test(output)) {
          clearTimeout(timer);
          this.child = child;
          debug(`registered ${this.instanceName}.${this.serviceType} with the system responder`);
          resolve(this);
        }
      });
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on('exit', (code) => {
        clearTimeout(timer);
        if (!this.child) reject(new Error(`dns-sd exited with code ${code}`));
      });
    });
  }

  stop(): void {
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
  }
}

/**
 * Advertise a service, preferring the system responder (macOS only) and falling back to our own
 * sockets. Returns { stop(), backend }.
 */
export async function startAdvertising(options: AdvertiseOptions): Promise<Advertisement> {
  const preferSystem = process.platform === 'darwin' && process.env.REMOTE_DEVICE_OWN_MDNS !== '1';
  await stopStaleRegistrations(options.instanceName);
  if (preferSystem) {
    try {
      const responder = await new SystemResponder(options).start();
      return { stop: () => responder.stop(), backend: 'system' };
    } catch (error) {
      debug(`system responder unavailable (${errorMessage(error)}); using our own sockets`);
    }
  }
  const responder = new Responder(options);
  await responder.start();
  return { stop: () => responder.stop(), backend: 'multicast' };
}

/**
 * Kill registrations this machine left behind for the same instance. A killed process keeps its
 * `dns-sd` child alive, and mDNSResponder then renames the next registration rather than replacing
 * it, so the phone shows one row per leftover.
 */
async function stopStaleRegistrations(instanceName: string): Promise<void> {
  if (process.platform !== 'darwin' || !instanceName) return;
  await new Promise<void>((resolve) => {
    execFile('pgrep', ['-f', `dns-sd -R ${instanceName}`], (_error, stdout) => {
      const pids = (stdout || '')
        .split('\n')
        .map((line) => Number(line.trim()))
        .filter((pid) => pid && pid !== process.pid);
      for (const pid of pids) {
        try {
          process.kill(pid, 'SIGTERM');
          debug(`stopped a leftover registration (pid ${pid})`);
        } catch {}
      }
      resolve();
    });
  });
}
