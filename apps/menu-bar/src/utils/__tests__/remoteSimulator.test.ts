import {
  getCollapsedDevices,
  sortDevicesByRecentUse,
  getDeviceId,
  getRemoteArchivePlatform,
  isRemoteDevice,
  isVirtualDevice,
} from '../device';
import {
  formatElapsedTime,
  formatRelativeTime,
  getRemoteSessionsBadge,
  getRemoteSimulatorProjects,
  parseLaunchArgs,
  parseStartedRemoteSimulator,
  parseTags,
} from '../remoteSimulator';

const app = (id: string, account: string) => ({
  id,
  slug: `slug-${id}`,
  ownerAccount: { name: account },
});
const account = (id: string, apps: ReturnType<typeof app>[]) => ({
  id,
  appsPaginated: { edges: apps.map((node) => ({ node })) },
});

describe(getRemoteArchivePlatform, () => {
  it('accepts hosted simulator tarballs and APKs, also with a signed query string', () => {
    expect(getRemoteArchivePlatform('https://expo.dev/artifacts/eas/a.tar.gz')).toBe('ios');
    expect(getRemoteArchivePlatform('https://expo.dev/a.tgz')).toBe('ios');
    expect(getRemoteArchivePlatform('https://expo.dev/a.apk?Signature=abc&x=.ipa')).toBe('android');
  });

  it('rejects every build that only a local device can take', () => {
    expect(getRemoteArchivePlatform('https://expo.dev/a.ipa')).toBeUndefined();
    expect(getRemoteArchivePlatform('https://expo.dev/a.aab')).toBeUndefined();
    expect(getRemoteArchivePlatform('/Users/me/build.tar.gz')).toBeUndefined();
    expect(getRemoteArchivePlatform('/Users/me/build.apk')).toBeUndefined();
    expect(getRemoteArchivePlatform('http://expo.dev/a.apk')).toBeUndefined();
    expect(getRemoteArchivePlatform('https://')).toBeUndefined();
  });
});

describe(getRemoteSimulatorProjects, () => {
  it('keeps only projects of accounts with access, without duplicates', () => {
    const projects = getRemoteSimulatorProjects({
      remoteAccounts: [{ id: 'a1', name: 'gated' }],
      accounts: [
        account('a1', [app('1', 'gated'), app('2', 'gated')]),
        account('a2', [app('3', 'other')]),
      ],
      pinnedApps: [app('4', 'other'), app('2', 'gated'), app('5', 'gated')],
    });
    expect(projects.map(({ id }) => id).sort()).toEqual(['1', '2', '5']);
    expect(projects.find(({ id }) => id === '1')?.label).toBe('gated/slug-1');
  });

  it('lists the projects of an account with access when every pinned project is elsewhere', () => {
    const projects = getRemoteSimulatorProjects({
      remoteAccounts: [{ id: 'a1', name: 'gated' }],
      accounts: [account('a1', [app('1', 'gated')])],
      pinnedApps: [app('4', 'other')],
    });
    expect(projects).toEqual([{ id: '1', label: 'gated/slug-1' }]);
  });

  it('puts the project used last first', () => {
    const projects = getRemoteSimulatorProjects({
      remoteAccounts: [{ id: 'a1', name: 'gated' }],
      accounts: [account('a1', [app('1', 'gated'), app('2', 'gated'), app('3', 'gated')])],
      lastAppId: '3',
    });
    expect(projects.map(({ id }) => id)).toEqual(['3', '1', '2']);
  });

  it('is empty when no account has access or nothing has loaded', () => {
    expect(
      getRemoteSimulatorProjects({ remoteAccounts: [], accounts: [account('a1', [app('1', 'x')])] })
    ).toEqual([]);
    expect(getRemoteSimulatorProjects({ remoteAccounts: [{ id: 'a1', name: 'gated' }] })).toEqual(
      []
    );
  });
});

describe(parseStartedRemoteSimulator, () => {
  const project = { id: '1', label: 'gated/my-app' };

  it('turns the session line of boot-device into a row that is starting', () => {
    const device = parseStartedRemoteSimulator(
      JSON.stringify({ remoteSimulatorSessionId: 'abc' }),
      'android',
      project
    );
    expect(device).toEqual({
      id: 'eas:abc',
      name: 'Started from Orbit',
      osType: 'Android',
      deviceType: 'remote',
      state: 'Starting',
      installable: true,
      accountName: 'gated',
      projectSlug: 'my-app',
    });
    expect(getDeviceId(device!)).toBe('eas:abc');
    expect(isRemoteDevice(device!)).toBe(true);
    // The local boot, install and resign code keys off this, and must not see a remote row.
    expect(isVirtualDevice(device!)).toBe(false);
  });

  it('ignores every other output line', () => {
    expect(parseStartedRemoteSimulator('Booting…', 'ios', project)).toBeUndefined();
    expect(parseStartedRemoteSimulator('{"other":1}', 'ios', project)).toBeUndefined();
  });
});

describe(getCollapsedDevices, () => {
  const simulator = (udid: string, overrides: object = {}) =>
    ({
      udid,
      name: udid,
      osType: 'iOS',
      deviceType: 'simulator',
      state: 'Shutdown',
      ...overrides,
    }) as any;
  const ids = (devices: any[]) => devices.map((d) => d.udid);

  it('keeps physical, running and selected devices, then the ones booted last', () => {
    const devices = [
      simulator('old', { lastBootedAt: 1 }),
      simulator('never'),
      simulator('selected'),
      simulator('recent', { lastBootedAt: 9 }),
      simulator('running', { state: 'Booted' }),
      { ...simulator('phone'), deviceType: 'device' },
      simulator('older', { lastBootedAt: 0.5 }),
    ];
    // Three virtual devices: the selected one, the running one, and the most recent of the rest.
    expect(ids(getCollapsedDevices(devices, 'selected'))).toEqual([
      'selected',
      'recent',
      'running',
      'phone',
    ]);
  });

  it('shows every pinned device, even past the limit', () => {
    const devices = ['a', 'b', 'c', 'd'].map((id) => simulator(id, { state: 'Booted' }));
    expect(getCollapsedDevices([...devices, simulator('x'), simulator('y')])).toHaveLength(4);
  });

  it('does not hide a single device or change a short list', () => {
    const four = ['a', 'b', 'c', 'd'].map((id) => simulator(id));
    expect(getCollapsedDevices(four)).toEqual(four);
    expect(getCollapsedDevices([])).toEqual([]);
  });
});

describe(sortDevicesByRecentUse, () => {
  const simulator = (udid: string, overrides: object = {}) =>
    ({
      udid,
      name: udid,
      osType: 'iOS',
      deviceType: 'simulator',
      state: 'Shutdown',
      ...overrides,
    }) as any;

  it('puts physical devices first, then running simulators, then the most recent boot', () => {
    const devices = [
      simulator('never'),
      simulator('old', { lastBootedAt: 1 }),
      simulator('recent', { lastBootedAt: 9 }),
      simulator('running', { state: 'Booted' }),
      simulator('phone', { deviceType: 'device' }),
    ];
    expect(sortDevicesByRecentUse(devices).map((d: any) => d.udid)).toEqual([
      'phone',
      'running',
      'recent',
      'old',
      'never',
    ]);
  });
});

describe(parseLaunchArgs, () => {
  it('splits on spaces and keeps quoted and escaped spaces', () => {
    expect(parseLaunchArgs('  -flag "a b" c\\ d \'\' ').value).toEqual(['-flag', 'a b', 'c d', '']);
    expect(parseLaunchArgs('').value).toEqual([]);
  });

  it('reports a quote that is not closed', () => {
    expect(parseLaunchArgs('-flag "a b').error).toBeDefined();
  });
});

describe(parseTags, () => {
  it('splits on commas, in lowercase and without duplicates', () => {
    expect(parseTags('Nightly, variant:pro,, nightly').value).toEqual(['nightly', 'variant:pro']);
  });

  it('reports too many tags and a tag that is too long', () => {
    expect(parseTags(Array.from({ length: 17 }, (_, i) => `t${i}`).join(',')).error).toBeDefined();
    expect(parseTags('a'.repeat(65)).error).toBeDefined();
  });
});

describe(formatRelativeTime, () => {
  it('uses minutes, hours, days and weeks', () => {
    const now = Date.parse('2026-11-15T12:00:00Z');
    expect(formatRelativeTime('2026-11-15T11:55:00Z', now)).toBe('5m ago');
    expect(formatRelativeTime('2026-11-15T09:00:00Z', now)).toBe('3h ago');
    expect(formatRelativeTime('2026-11-13T12:00:00Z', now)).toBe('2d ago');
    expect(formatRelativeTime('2026-11-01T12:00:00Z', now)).toBe('2w ago');
  });
});

describe(getRemoteSessionsBadge, () => {
  it('shows the number of sessions, and nothing with no session', () => {
    expect(getRemoteSessionsBadge(0)).toBeNull();
    expect(getRemoteSessionsBadge(1)).toBe('1');
    expect(getRemoteSessionsBadge(9)).toBe('9');
  });

  it('shows 9+ above nine sessions', () => {
    expect(getRemoteSessionsBadge(10)).toBe('9+');
    expect(getRemoteSessionsBadge(20)).toBe('9+');
  });
});

describe(formatElapsedTime, () => {
  const now = new Date('2026-11-10T12:00:00Z').getTime();
  const since = (minutes: number) => new Date(now - minutes * 60000).toISOString();

  it('uses minutes up to one hour, then hours and minutes', () => {
    expect(formatElapsedTime(since(0), now)).toBe('<1 min');
    expect(formatElapsedTime(since(1), now)).toBe('1 min');
    expect(formatElapsedTime(since(12), now)).toBe('12 min');
    expect(formatElapsedTime(since(60), now)).toBe('1 h');
    expect(formatElapsedTime(since(65), now)).toBe('1 h 5 min');
  });

  it('does not go below zero when the clocks differ', () => {
    expect(formatElapsedTime(since(-3), now)).toBe('<1 min');
  });
});
