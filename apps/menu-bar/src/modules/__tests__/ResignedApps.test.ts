import {
  getRenewalBlockReason,
  isRenewalDue,
  listResignedApps,
  readResignedApps,
  ResignedAppRecord,
  stripOrbitSuffix,
  upsertResignedApp,
} from '../ResignedApps';
import { storage } from '../Storage';

jest.mock('../MenuBarModule', () => ({ __esModule: true, default: { homedir: '/Users/test' } }));
jest.mock('../DeviceEventEmitter', () => ({
  DeviceEventEmitter: { emit: jest.fn(), addListener: jest.fn() },
}));
jest.mock('../Storage', () => {
  const values = new Map<string, string>();
  return {
    storage: {
      getString: (key: string) => values.get(key),
      set: (key: string, value: string | boolean) => values.set(key, String(value)),
      delete: (key: string) => values.delete(key),
    },
  };
});

const NOW = Date.parse('2026-10-13T12:00:00Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

function record(overrides: Partial<ResignedAppRecord> = {}): ResignedAppRecord {
  return {
    id: 'com.x.app.orbit07bcf83b:UDID-1',
    appName: 'App',
    originalBundleId: 'com.x.app',
    assignedBundleId: 'com.x.app.orbit07bcf83b',
    appleId: 'me@icloud.com',
    originalIpaPath: '/r/original.ipa',
    resignedIpaPath: '/r/resigned.ipa',
    recordDirName: 'com.x.app.orbit07bcf83b_UDID-1',
    profileExpiresAt: at(7 * DAY),
    lastRenewedAt: at(0),
    deviceUdid: 'UDID-1',
    deviceName: 'iPhone',
    deviceLastSeenAt: at(0),
    stripExtensions: false,
    autoRenew: true,
    pendingInstall: false,
    ...overrides,
  };
}

beforeEach(() => {
  storage.delete('apple-resign:resigned-apps');
});

describe(stripOrbitSuffix, () => {
  it('drops the `.orbit<hash8>` suffix ipa-resign adds and nothing else', () => {
    expect(stripOrbitSuffix('com.x.app.orbit07bcf83b')).toBe('com.x.app');
    expect(stripOrbitSuffix('com.x.app')).toBe('com.x.app');
    expect(stripOrbitSuffix('com.x.app.orbitstore')).toBe('com.x.app.orbitstore');
  });
});

describe(isRenewalDue, () => {
  it('is due inside the 48h window, when expired, and never for an unparseable date', () => {
    expect(isRenewalDue(record({ profileExpiresAt: at(3 * DAY) }), NOW)).toBe(false);
    expect(isRenewalDue(record({ profileExpiresAt: at(47 * HOUR) }), NOW)).toBe(true);
    expect(isRenewalDue(record({ profileExpiresAt: at(-HOUR) }), NOW)).toBe(true);
    expect(isRenewalDue(record({ profileExpiresAt: 'soon' }), NOW)).toBe(false);
  });
});

describe(getRenewalBlockReason, () => {
  it('lets a due record through when nothing blocks it', () => {
    expect(getRenewalBlockReason(record(), NOW)).toBeNull();
    expect(getRenewalBlockReason(record({ lastAttemptAt: at(-5 * HOUR) }), NOW)).toBeNull();
  });

  it('reports the per-record switch, a recent attempt, and a device unseen for 30 days', () => {
    expect(getRenewalBlockReason(record({ autoRenew: false }), NOW)).toBe('disabled');
    expect(getRenewalBlockReason(record({ lastAttemptAt: at(-HOUR) }), NOW)).toBe('backoff');
    expect(getRenewalBlockReason(record({ deviceLastSeenAt: at(-31 * DAY) }), NOW)).toBe('stale');
    expect(getRenewalBlockReason(record({ deviceLastSeenAt: at(-29 * DAY) }), NOW)).toBeNull();
  });

  it('ranks the reasons: disabled, then backoff, then stale', () => {
    const blocked = record({
      autoRenew: false,
      lastAttemptAt: at(-HOUR),
      deviceLastSeenAt: at(-31 * DAY),
    });
    expect(getRenewalBlockReason(blocked, NOW)).toBe('disabled');
    expect(getRenewalBlockReason({ ...blocked, autoRenew: true }, NOW)).toBe('backoff');
  });
});

describe(upsertResignedApp, () => {
  it('keeps one record per app and device, replacing one renewed under a new identifier', () => {
    upsertResignedApp(record());
    upsertResignedApp(
      record({ id: 'com.x.app.orbitdeadbeef:UDID-1', assignedBundleId: 'com.x.app.orbitdeadbeef' })
    );
    expect(listResignedApps().map((r) => r.assignedBundleId)).toEqual(['com.x.app.orbitdeadbeef']);
  });

  it('keeps the same app on another device and other apps on the same device', () => {
    upsertResignedApp(record());
    upsertResignedApp(record({ id: 'com.x.app.orbit07bcf83b:UDID-2', deviceUdid: 'UDID-2' }));
    upsertResignedApp(
      record({
        id: 'com.y.app.orbit11111111:UDID-1',
        originalBundleId: 'com.y.app',
        assignedBundleId: 'com.y.app.orbit11111111',
      })
    );
    expect(listResignedApps()).toHaveLength(3);
  });
});

describe(readResignedApps, () => {
  it('tells unreadable records apart from none, while the list reads as empty', () => {
    expect(readResignedApps()).toEqual([]);
    storage.set('apple-resign:resigned-apps', '{not json');
    expect(readResignedApps()).toBeNull();
    expect(listResignedApps()).toEqual([]);
  });
});
