import { StorageUtils } from 'common-types';

import { DeviceEventEmitter } from './DeviceEventEmitter';
import MenuBarModule from './MenuBarModule';
import { storage } from './Storage';

/**
 * Persistent record of every app Orbit re-signed with a free Apple ID.
 * Free-account provisioning profiles die after 7 days; these records are what
 * the renewal engine walks to re-sign apps before they stop launching.
 */
export type ResignedAppRecord = {
  /** `${assignedBundleId}:${deviceUdid}` — dedupe key */
  id: string;
  appName: string;
  /** Bundle id found in the source ipa */
  originalBundleId: string;
  /** Rewritten id the app was signed as (`<original>.orbit<hash8>`) */
  assignedBundleId: string;
  appleId: string;
  /** Managed durable copy of the source ipa — renewals MUST re-sign this file */
  originalIpaPath: string;
  /** Managed output of the last resign */
  resignedIpaPath: string;
  /** Directory name under the managed dir; passed to cleanup-resigned-apps */
  recordDirName: string;
  sourceUri?: string;
  /** Standard PNG of the app icon, extracted into the record dir by the CLI */
  iconPath?: string;
  profileExpiresAt: string;
  lastRenewedAt: string;
  deviceUdid: string;
  deviceName: string;
  deviceLastSeenAt: string;
  launchURL?: string;
  stripExtensions: boolean;
  autoRenew: boolean;
  /** Renewed while the device was away; install when it reappears */
  pendingInstall: boolean;
  lastAttemptAt?: string;
  lastError?: { code: string; message: string; at: string };
};

export type ResignAttention = {
  kind: 'auth-required' | 'renewal-failed';
  message: string;
  at: string;
};

const RESIGNED_APPS_KEY = 'apple-resign:resigned-apps';
const ATTENTION_KEY = 'apple-resign:attention';

// MMKV changes don't cross Electron renderer windows, so every write also
// emits this event through the main-process DeviceEventEmitter broadcast.
export const RESIGNED_APPS_CHANGED_EVENT = 'resigned-apps:changed';
// Settings asks the engine (mounted in the popover's Core) to renew one record.
export const RESIGNED_APPS_RENEW_REQUEST_EVENT = 'resigned-apps:renew-request';
// DebugMenu asks the engine to run a renewal check right now.
export const RESIGNED_APPS_CHECK_REQUEST_EVENT = 'resigned-apps:check-request';

export const RENEWAL_DUE_WINDOW_MS = 48 * 60 * 60 * 1000;
export const RENEWAL_BACKOFF_MS = 4 * 60 * 60 * 1000;
export const RENEWAL_STALE_DEVICE_MS = 30 * 24 * 60 * 60 * 1000;

function emitChanged() {
  DeviceEventEmitter.emit(RESIGNED_APPS_CHANGED_EVENT);
}

export function buildResignedAppId(assignedBundleId: string, deviceUdid: string): string {
  return `${assignedBundleId}:${deviceUdid}`;
}

/** Recover the original bundle id from the rewritten `<id>.orbit<hash8>` one. */
export function stripOrbitSuffix(bundleId: string): string {
  return bundleId.replace(/\.orbit[0-9a-f]{8}$/, '');
}

export function getResignedAppsDirectory(): string {
  return `${StorageUtils.getExpoOrbitDirectory(MenuBarModule.homedir)}/resigned-apps`;
}

export function listResignedApps(): ResignedAppRecord[] {
  const raw = storage.getString(RESIGNED_APPS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ResignedAppRecord[];
  } catch {
    return [];
  }
}

function saveRecords(records: ResignedAppRecord[]) {
  storage.set(RESIGNED_APPS_KEY, JSON.stringify(records));
  emitChanged();
}

export function upsertResignedApp(record: ResignedAppRecord) {
  // One record per (original app, device): a renewal lands on a new identifier
  // when Apple refuses the old one, and the stale record must not linger.
  const records = listResignedApps().filter(
    (r) =>
      r.id !== record.id &&
      !(r.originalBundleId === record.originalBundleId && r.deviceUdid === record.deviceUdid)
  );
  records.push(record);
  saveRecords(records);
}

export function updateResignedApp(
  id: string,
  patch: Partial<ResignedAppRecord>
): ResignedAppRecord | undefined {
  const records = listResignedApps();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) return undefined;
  records[index] = { ...records[index], ...patch };
  saveRecords(records);
  return records[index];
}

export function removeResignedApp(id: string) {
  saveRecords(listResignedApps().filter((r) => r.id !== id));
}

export function getAttention(): ResignAttention | null {
  const raw = storage.getString(ATTENTION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ResignAttention;
  } catch {
    return null;
  }
}

export function setAttention(attention: ResignAttention | null) {
  if (attention) {
    storage.set(ATTENTION_KEY, JSON.stringify(attention));
  } else {
    storage.delete(ATTENTION_KEY);
  }
  emitChanged();
}

/** A record wants renewing when its profile expires within the due window. */
export function isRenewalDue(record: ResignedAppRecord, now: number): boolean {
  const expiresAt = Date.parse(record.profileExpiresAt);
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt - now < RENEWAL_DUE_WINDOW_MS;
}

/**
 * Why an otherwise-due record must be skipped by the automatic engine:
 * - 'disabled': per-record auto-renew is off
 * - 'backoff': a renewal was attempted recently
 * - 'stale': the device hasn't been seen for 30 days — renewing would risk
 *   re-registering an expired App ID and burning free-account quota for a
 *   device that may be gone.
 */
export function getRenewalBlockReason(
  record: ResignedAppRecord,
  now: number
): 'disabled' | 'backoff' | 'stale' | null {
  if (!record.autoRenew) return 'disabled';
  const lastAttempt = record.lastAttemptAt ? Date.parse(record.lastAttemptAt) : NaN;
  if (!Number.isNaN(lastAttempt) && now - lastAttempt < RENEWAL_BACKOFF_MS) return 'backoff';
  const lastSeen = Date.parse(record.deviceLastSeenAt);
  if (!Number.isNaN(lastSeen) && now - lastSeen > RENEWAL_STALE_DEVICE_MS) return 'stale';
  return null;
}
