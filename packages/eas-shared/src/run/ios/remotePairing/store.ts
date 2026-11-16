// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// Persistent state: host identity and per-device pairing records.
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { parsePlist, toXmlPlist } from './plist';
import { getDataDirectory } from '../../../paths';

export const STATE_DIR: string =
  process.env.ORBIT_REMOTE_PAIRING_HOME || path.join(getDataDirectory(), 'remote-pairing');

const HOST_FILE = 'host.json';
const DEVICES_DIR = 'devices';
const PAIR_RECORDS_DIR = 'pair-records';

/** This machine's stable identity as a pairable DeviceHub host. */
export interface HostIdentity {
  identifier: string;
  /** 16-byte alternate identity resolving key; the phone derives our mDNS authTag from it. */
  altIrk: Buffer;
  name: string;
  model: string;
  createdAt: string;
}

/** A saved pairing with one iPhone. */
export interface DeviceRecord {
  udid: string;
  name: string;
  model: string | null;
  accountId: string | null;
  hostIdentifier: string;
  hostAltIrk: Buffer;
  peerAltIrk: Buffer;
  /** 32-byte Ed25519 seed of our long-term pairing key. */
  privateKey: Buffer;
  publicKey: Buffer;
  pairedAt: string;
  importedFrom?: string;
  lastHost?: string;
  lastPort?: number;
  lastSeenAt?: string;
  osVersion?: string;
  productType?: string;
}

type SerializedHostIdentity = Omit<HostIdentity, 'altIrk'> & { altIrk: string };

type SerializedDeviceRecord = Omit<
  DeviceRecord,
  'privateKey' | 'publicKey' | 'hostAltIrk' | 'peerAltIrk'
> & {
  privateKey: string;
  publicKey: string;
  hostAltIrk: string;
  peerAltIrk: string;
};

function isErrnoCode(error: unknown, code: string): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === code;
}

function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

function writeJsonAtomic(file: string, value: unknown): void {
  ensureDir(path.dirname(file));
  const temporary = `${file}.${process.pid}.part`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temporary, file);
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (error) {
    if (isErrnoCode(error, 'ENOENT')) return null;
    throw error;
  }
}

/**
 * The host identity persists across pairings: the iPhone remembers us by identifier and
 * recognises the mDNS authTag derived from altIRK, so both must stay stable.
 */
export function loadHostIdentity(root: string = STATE_DIR): HostIdentity {
  const file = path.join(root, HOST_FILE);
  const existing = readJson<Partial<SerializedHostIdentity>>(file);
  if (existing?.identifier && existing?.altIrk) {
    return {
      ...(existing as SerializedHostIdentity),
      altIrk: Buffer.from(existing.altIrk, 'base64'),
    };
  }
  const identity: HostIdentity = {
    identifier: crypto.randomUUID().toUpperCase(),
    altIrk: crypto.randomBytes(16),
    name: existing?.name || defaultHostName(),
    model: existing?.model || 'Mac14,6',
    createdAt: new Date().toISOString(),
  };
  writeJsonAtomic(file, { ...identity, altIrk: identity.altIrk.toString('base64') });
  return identity;
}

export function defaultHostName(): string {
  const host = os.hostname().replace(/\.local$/i, '');
  return host ? `${host} (Expo Orbit)` : 'Expo Orbit';
}

export function devicePath(udid: string, root: string = STATE_DIR): string {
  if (!/^[A-Za-z0-9-]+$/.test(udid)) throw new Error(`invalid udid ${udid}`);
  return path.join(root, DEVICES_DIR, `${udid}.json`);
}

export function saveDevice(record: DeviceRecord, root: string = STATE_DIR): DeviceRecord {
  const serialised: SerializedDeviceRecord = {
    ...record,
    privateKey: record.privateKey.toString('base64'),
    publicKey: record.publicKey.toString('base64'),
    hostAltIrk: record.hostAltIrk.toString('base64'),
    peerAltIrk: record.peerAltIrk.toString('base64'),
  };
  writeJsonAtomic(devicePath(record.udid, root), serialised);
  // Also emit a pymobiledevice3-compatible remote pair record for interoperability.
  const plistFile = path.join(root, PAIR_RECORDS_DIR, `remote_${record.udid}.plist`);
  ensureDir(path.dirname(plistFile));
  fs.writeFileSync(
    plistFile,
    toXmlPlist({
      public_key: record.publicKey,
      private_key: record.privateKey,
      remote_unlock_host_key: '',
      host_identifier: record.hostIdentifier,
      host_alt_irk: record.hostAltIrk,
      peer_alt_irk: record.peerAltIrk,
      peer_udid: record.udid,
      peer_model: record.model,
      peer_name: record.name,
    }),
    { mode: 0o600 }
  );
  return record;
}

function hydrate(raw: SerializedDeviceRecord | null): DeviceRecord | null {
  if (!raw) return null;
  return {
    ...raw,
    privateKey: Buffer.from(raw.privateKey, 'base64'),
    publicKey: Buffer.from(raw.publicKey, 'base64'),
    hostAltIrk: Buffer.from(raw.hostAltIrk, 'base64'),
    peerAltIrk: Buffer.from(raw.peerAltIrk, 'base64'),
  };
}

export function loadDevice(udid: string, root: string = STATE_DIR): DeviceRecord | null {
  return hydrate(readJson<SerializedDeviceRecord>(devicePath(udid, root)));
}

export function listDevices(root: string = STATE_DIR): DeviceRecord[] {
  const dir = path.join(root, DEVICES_DIR);
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).filter((name) => name.endsWith('.json'));
  } catch (error) {
    if (!isErrnoCode(error, 'ENOENT')) throw error;
  }
  return names
    .map((name) => hydrate(readJson<SerializedDeviceRecord>(path.join(dir, name))))
    .filter((record): record is DeviceRecord => Boolean(record))
    .sort((a, b) =>
      (b.lastSeenAt || b.pairedAt || '').localeCompare(a.lastSeenAt || a.pairedAt || '')
    );
}

export function updateDevice(
  udid: string,
  changes: Partial<DeviceRecord>,
  root: string = STATE_DIR
): DeviceRecord {
  const current = loadDevice(udid, root);
  if (!current) throw new Error(`no pairing for ${udid}`);
  return saveDevice({ ...current, ...changes }, root);
}

export function deleteDevice(udid: string, root: string = STATE_DIR): void {
  const files = [devicePath(udid, root), path.join(root, PAIR_RECORDS_DIR, `remote_${udid}.plist`)];
  for (const file of files) {
    try {
      fs.unlinkSync(file);
    } catch (error) {
      if (!isErrnoCode(error, 'ENOENT')) throw error;
    }
  }
}

/** Fields of a pymobiledevice3 remote pair record plist. */
interface PairRecordPlist {
  host_identifier?: string;
  host_alt_irk?: Buffer;
  peer_alt_irk?: Buffer;
  private_key?: Buffer;
  public_key?: Buffer;
  peer_udid?: string;
  peer_name?: string;
  peer_model?: string;
}

/**
 * Import a pymobiledevice3 `remote_<udid>.plist` written by its pairable-host flow.
 * Host-initiated records (no host_identifier) are rejected: they belong to a different identity.
 */
export function importPairRecordPlist(file: string, root: string = STATE_DIR): DeviceRecord {
  const plist = parsePlist(fs.readFileSync(file)) as PairRecordPlist;
  if (!plist.host_identifier || !plist.private_key || !plist.peer_alt_irk) {
    throw new Error(
      `${file} is not a device-initiated pair record (missing host_identifier/peer_alt_irk)`
    );
  }
  const udid =
    plist.peer_udid ||
    path
      .basename(file)
      .replace(/^remote_/, '')
      .replace(/\.plist$/, '');
  return saveDevice(
    {
      udid,
      name: plist.peer_name || udid,
      model: plist.peer_model || null,
      accountId: null,
      hostIdentifier: plist.host_identifier,
      hostAltIrk: Buffer.from(plist.host_alt_irk || Buffer.alloc(16)),
      peerAltIrk: Buffer.from(plist.peer_alt_irk),
      privateKey: Buffer.from(plist.private_key),
      // Matches the source: a missing public_key throws here.
      publicKey: Buffer.from(plist.public_key as Buffer),
      pairedAt: fs.statSync(file).mtime.toISOString(),
      importedFrom: file,
    },
    root
  );
}
