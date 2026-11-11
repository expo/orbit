import { ClientError } from 'graphql-request';

import { graphqlSdk } from '../../api/GraphqlClient';
import { getCustomTrustedSources, getSessionSecret } from '../../storage';
import {
  bootRemoteSimulatorAsync,
  installOnRemoteSimulatorAsync,
  listRemoteSimulatorOptionsAsync,
  listRemoteSimulatorsAsync,
  stopRemoteSimulatorAsync,
} from '../RemoteSimulator';

jest.mock('../../api/GraphqlClient', () => ({
  graphqlSdk: {
    getRemoteSimulatorAccounts: jest.fn(),
    getAccountDeviceRunSessions: jest.fn(),
    getDeviceRunSessionStatus: jest.fn(),
    getDeviceRunSessionController: jest.fn(),
    createDeviceRunSession: jest.fn(),
    getRemoteSimulatorOptions: jest.fn(),
    ensureDeviceRunSessionStopped: jest.fn(),
  },
}));
jest.mock('../../storage', () => ({
  getSessionSecret: jest.fn(() => 'session'),
  getCustomTrustedSources: jest.fn(() => []),
}));

const sdk = jest.mocked(graphqlSdk);
const TOKEN = 'secret-controller-token';
const BASE_URL = 'https://agent-device-abc.simulator.example';
const BUILD_URL = 'https://expo.dev/artifacts/eas/build.tar.gz';

const account = (id: string, paid: boolean) => ({
  id,
  name: `name-${id}`,
  subscription: { planId: paid ? 'price_production' : 'price_free' },
});
const session = (id: string, actorId: string, overrides: object = {}) => ({
  node: {
    id,
    name: null,
    status: 'IN_PROGRESS',
    type: 'AGENT_DEVICE',
    platform: 'IOS',
    initiatingActor: { id: actorId },
    app: { id: 'app', slug: 'my-app', ownerAccount: { id: 'a1', name: 'name-a1' } },
    ...overrides,
  },
});
const page = (edges: object[], endCursor?: string) => ({
  account: {
    byId: {
      id: 'a1',
      deviceRunSessionsPaginated: {
        edges,
        pageInfo: { hasNextPage: !!endCursor, endCursor: endCursor ?? null },
      },
    },
  },
});
const controller = (overrides: object = {}) => ({
  deviceRunSessions: {
    byId: {
      id: 's1',
      status: 'IN_PROGRESS',
      platform: 'IOS',
      remoteConfig: {
        __typename: 'AgentDeviceRunSessionRemoteConfig',
        agentDeviceRemoteSessionUrl: `${BASE_URL}/`,
        agentDeviceRemoteSessionToken: TOKEN,
      },
      ...overrides,
    },
  },
});

function mockFetch(handler: (url: string, body: any) => unknown) {
  const calls: { url: string; headers: Record<string, string>; body: any }[] = [];
  global.fetch = jest.fn(async (url: any, init: any = {}) => {
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url: String(url), headers: init.headers ?? {}, body });
    const result = handler(String(url), body);
    return { ok: true, json: async () => result } as Response;
  }) as typeof fetch;
  return calls;
}
const rpcOk = (data: object) => ({ jsonrpc: '2.0', result: { ok: true, data } });
const healthy = { ok: true, rpcProtocolVersion: 2 };

/** Everything the menu bar would log for a failed command: message, details and stack. */
async function loggedFailure(promise: Promise<unknown>) {
  const error: any = await promise.then(
    () => {
      throw new Error('expected a rejection');
    },
    (e) => e
  );
  return { error, logged: JSON.stringify([error.message, error.details, error.stack, error.cause]) };
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(getSessionSecret).mockReturnValue('session');
  jest.mocked(getCustomTrustedSources).mockReturnValue([]);
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

describe(listRemoteSimulatorsAsync, () => {
  it('returns nothing and sends no request when signed out', async () => {
    jest.mocked(getSessionSecret).mockReturnValue(undefined);
    expect(await listRemoteSimulatorsAsync()).toEqual({ devices: [], accounts: [] });
    expect(sdk.getRemoteSimulatorAccounts).not.toHaveBeenCalled();
  });

  it('returns nothing and lists no sessions when no account is on a paid plan', async () => {
    sdk.getRemoteSimulatorAccounts.mockResolvedValue({
      meUserActor: { id: 'me', accounts: [account('a1', false), { ...account('a2', true), subscription: null }] },
    } as any);
    expect(await listRemoteSimulatorsAsync()).toEqual({ devices: [], accounts: [] });
    expect(sdk.getAccountDeviceRunSessions).not.toHaveBeenCalled();
  });

  it('lists one idle row per platform and only the sessions the user started, across pages', async () => {
    sdk.getRemoteSimulatorAccounts.mockResolvedValue({
      meUserActor: { id: 'me', accounts: [account('a1', true), account('a2', false)] },
    } as any);
    sdk.getAccountDeviceRunSessions
      .mockResolvedValueOnce(page([session('s1', 'me'), session('s2', 'other')], 'cursor') as any)
      .mockResolvedValueOnce(
        page([
          session('s3', 'me', { status: 'QUEUED', platform: 'ANDROID', type: 'APPIUM', name: 'QA' }),
        ]) as any
      );

    const result = await listRemoteSimulatorsAsync();

    expect(result.accounts).toEqual([{ id: 'a1', name: 'name-a1' }]);
    expect(sdk.getAccountDeviceRunSessions).toHaveBeenCalledTimes(2);
    expect(sdk.getAccountDeviceRunSessions).toHaveBeenLastCalledWith({
      accountId: 'a1',
      after: 'cursor',
    });
    expect(result.devices.map((d) => [d.id, d.state, d.osType, d.installable])).toEqual([
      ['eas:ios', 'Shutdown', 'iOS', undefined],
      ['eas:android', 'Shutdown', 'Android', undefined],
      ['eas:s1', 'Booted', 'iOS', true],
      ['eas:s3', 'Starting', 'Android', false],
    ]);
    expect(result.devices[2]).toMatchObject({ name: 'my-app', accountName: 'name-a1' });
    expect(result.devices[3].name).toBe('QA');
  });
});

describe(bootRemoteSimulatorAsync, () => {
  const created = { deviceRunSession: { createDeviceRunSession: { id: 's1', status: 'NEW' } } };
  const status = (value: string) => ({ deviceRunSessions: { byId: { id: 's1', status: value } } });

  beforeEach(() => {
    sdk.createDeviceRunSession.mockResolvedValue(created as any);
    sdk.ensureDeviceRunSessionStopped.mockResolvedValue({} as any);
  });

  it('creates an agent-device session for the project and reports its ID first', async () => {
    sdk.getDeviceRunSessionStatus.mockResolvedValue(status('IN_PROGRESS') as any);

    const result = await bootRemoteSimulatorAsync({
      platform: 'ios',
      appId: 'app',
      archiveUrl: BUILD_URL,
      openUrl: 'myapp://home',
      maxRunTime: '30',
    });

    expect(result).toEqual({ sessionId: 's1' });
    expect(sdk.createDeviceRunSession).toHaveBeenCalledTimes(1);
    expect(sdk.createDeviceRunSession).toHaveBeenCalledWith({
      deviceRunSessionInput: {
        appId: 'app',
        platform: 'IOS',
        type: 'AGENT_DEVICE',
        maxRunTimeMinutes: 30,
        name: 'Started from Orbit',
        applicationArchiveUrl: BUILD_URL,
        openUrl: 'myapp://home',
      },
    });
    expect(console.log).toHaveBeenCalledWith(JSON.stringify({ remoteSimulatorSessionId: 's1' }));
    expect(sdk.ensureDeviceRunSessionStopped).not.toHaveBeenCalled();
  });

  it('passes the choices of the "Create new simulator" window to the session', async () => {
    sdk.getDeviceRunSessionStatus.mockResolvedValue(status('IN_PROGRESS') as any);

    await bootRemoteSimulatorAsync({
      platform: 'android',
      appId: 'app',
      name: ' Checkout flow ',
      deviceIdentifier: 'pixel_9',
      expoGo: true,
      sdkVersion: '57.0.0',
      launchArgs: '["-flag","a b"]',
      tags: '["nightly"]',
      sessionType: 'argent',
    });

    expect(sdk.createDeviceRunSession).toHaveBeenCalledWith({
      deviceRunSessionInput: {
        appId: 'app',
        platform: 'ANDROID',
        type: 'ARGENT',
        maxRunTimeMinutes: 30,
        name: 'Checkout flow',
        android: { deviceIdentifier: 'pixel_9' },
        expoGo: true,
        sdkVersion: '57.0.0',
        launchArgs: ['-flag', 'a b'],
        tags: ['nightly'],
      },
    });
  });

  it('creates no session for two build sources, an unknown controller or a bad list', async () => {
    const base = { platform: 'ios' as const, appId: 'app' };
    await expect(
      bootRemoteSimulatorAsync({ ...base, buildId: 'b1', expoGo: true })
    ).rejects.toThrow('only one of');
    await expect(bootRemoteSimulatorAsync({ ...base, sessionType: 'other' })).rejects.toThrow(
      '--session-type'
    );
    await expect(bootRemoteSimulatorAsync({ ...base, tags: 'nightly' })).rejects.toThrow('--tags');
    expect(sdk.createDeviceRunSession).not.toHaveBeenCalled();
  });

  it('creates no session for a build URL that is not trusted, or without a project', async () => {
    await expect(
      bootRemoteSimulatorAsync({ platform: 'ios', appId: 'app', archiveUrl: 'https://evil.example/a.tar.gz' })
    ).rejects.toMatchObject({ code: 'UNTRUSTED_SOURCE' });
    await expect(bootRemoteSimulatorAsync({ platform: 'ios' })).rejects.toMatchObject({
      code: 'REMOTE_SIMULATOR_FAILED',
    });
    expect(sdk.createDeviceRunSession).not.toHaveBeenCalled();
  });

  it('does not retry a failed create, and shows the server message', async () => {
    sdk.createDeviceRunSession.mockRejectedValue(
      new ClientError({ status: 200, errors: [{ message: 'Plan limit reached' }] } as any, {
        query: '',
      })
    );
    await expect(bootRemoteSimulatorAsync({ platform: 'android', appId: 'app' })).rejects.toThrow(
      'Could not start the Expo Simulators session: Plan limit reached'
    );
    expect(sdk.createDeviceRunSession).toHaveBeenCalledTimes(1);
  });

  it('stops the session when it ends before it is ready', async () => {
    sdk.getDeviceRunSessionStatus.mockResolvedValue(status('ERRORED') as any);
    await expect(bootRemoteSimulatorAsync({ platform: 'ios', appId: 'app' })).rejects.toMatchObject({
      code: 'REMOTE_SIMULATOR_FAILED',
    });
    expect(sdk.ensureDeviceRunSessionStopped).toHaveBeenCalledWith({ deviceRunSessionId: 's1' });
  });

  it('keeps the session when one status request fails before the session is ready', async () => {
    jest.useFakeTimers();
    try {
      sdk.getDeviceRunSessionStatus
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue(status('IN_PROGRESS') as any);
      const boot = bootRemoteSimulatorAsync({ platform: 'ios', appId: 'app' });
      await jest.advanceTimersByTimeAsync(10 * 1000);
      await expect(boot).resolves.toEqual({ sessionId: 's1' });
      expect(sdk.getDeviceRunSessionStatus).toHaveBeenCalledTimes(2);
      expect(sdk.ensureDeviceRunSessionStopped).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('stops a session that is still queued when the total limit expires', async () => {
    jest.useFakeTimers();
    try {
      sdk.getDeviceRunSessionStatus.mockResolvedValue(status('QUEUED') as any);
      const boot = bootRemoteSimulatorAsync({ platform: 'ios', appId: 'app' });
      const failure = expect(boot).rejects.toThrow('did not start in 30 minutes');
      await jest.advanceTimersByTimeAsync(31 * 60 * 1000);
      await failure;
      expect(sdk.ensureDeviceRunSessionStopped).toHaveBeenCalledWith({ deviceRunSessionId: 's1' });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe(stopRemoteSimulatorAsync, () => {
  it('stops the session behind a device ID', async () => {
    sdk.ensureDeviceRunSessionStopped.mockResolvedValue({
      deviceRunSession: { ensureDeviceRunSessionStopped: { id: 's1', status: 'STOPPED' } },
    } as any);
    expect(await stopRemoteSimulatorAsync({ id: 'eas:s1' })).toEqual({ status: 'STOPPED' });
    expect(sdk.ensureDeviceRunSessionStopped).toHaveBeenCalledWith({ deviceRunSessionId: 's1' });
  });
});

describe(installOnRemoteSimulatorAsync, () => {
  it('installs from the URL with the session token, then opens the app the controller names', async () => {
    sdk.getDeviceRunSessionController.mockResolvedValue(controller() as any);
    const calls = mockFetch((url, body) =>
      url.endsWith('/health')
        ? healthy
        : body.method === 'agent_device.install_from_source'
          ? rpcOk({ bundleId: 'dev.example.app', launchTarget: 'dev.example.app' })
          : rpcOk({})
    );

    await installOnRemoteSimulatorAsync({ deviceId: 'eas:s1', url: BUILD_URL });

    expect(sdk.getDeviceRunSessionController).toHaveBeenCalledWith({ deviceRunSessionId: 's1' });
    expect(calls.map((c) => c.url)).toEqual([
      `${BASE_URL}/health`,
      `${BASE_URL}/rpc`,
      `${BASE_URL}/rpc`,
    ]);
    expect(calls[1].headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(calls[1].body).toMatchObject({
      jsonrpc: '2.0',
      method: 'agent_device.install_from_source',
      params: { platform: 'ios', source: { kind: 'url', url: BUILD_URL } },
    });
    expect(calls[2].body).toMatchObject({
      method: 'agent_device.command',
      params: { command: 'open', positionals: ['dev.example.app'], flags: { platform: 'ios' } },
    });
  });

  it('opens the launch URL, and falls back to the app when that fails', async () => {
    sdk.getDeviceRunSessionController.mockResolvedValue(controller() as any);
    const calls = mockFetch((url, body) => {
      if (url.endsWith('/health')) return healthy;
      if (body.method === 'agent_device.install_from_source') return rpcOk({ launchTarget: 'app' });
      return body.params.positionals[0] === 'myapp://x'
        ? { result: { ok: false, error: { code: 'COMMAND_FAILED', message: 'no' } } }
        : rpcOk({});
    });

    await installOnRemoteSimulatorAsync({ deviceId: 'eas:s1', url: BUILD_URL, launchUrl: 'myapp://x' });

    expect(calls.slice(2).map((c) => c.body.params.positionals[0])).toEqual(['myapp://x', 'app']);
  });

  it('checks the URL before it reads the session or calls the controller', async () => {
    const calls = mockFetch(() => healthy);
    await expect(
      installOnRemoteSimulatorAsync({ deviceId: 'eas:s1', url: 'https://evil.example/a.apk' })
    ).rejects.toMatchObject({ code: 'UNTRUSTED_SOURCE' });
    expect(sdk.getDeviceRunSessionController).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it('never puts the token or controller URL in an error, even when the API error echoes them', async () => {
    sdk.getDeviceRunSessionController.mockRejectedValue(
      new ClientError(
        { status: 200, errors: [{ message: 'partial' }], data: controller() } as any,
        { query: 'query', variables: {} }
      )
    );
    const api = await loggedFailure(installOnRemoteSimulatorAsync({ deviceId: 'eas:s1', url: BUILD_URL }));
    expect(api.error.code).toBe('REMOTE_SIMULATOR_UNAVAILABLE');
    expect(api.logged).not.toContain(TOKEN);
    expect(api.logged).not.toContain(BASE_URL);

    sdk.getDeviceRunSessionController.mockResolvedValue(controller() as any);
    mockFetch((url) =>
      url.endsWith('/health')
        ? healthy
        : { result: { ok: false, error: { code: 'COMMAND_FAILED', message: `${BASE_URL} ${TOKEN}` } } }
    );
    const daemon = await loggedFailure(installOnRemoteSimulatorAsync({ deviceId: 'eas:s1', url: BUILD_URL }));
    expect(daemon.error.code).toBe('REMOTE_SIMULATOR_FAILED');
    expect(daemon.error.message).toContain('(COMMAND_FAILED)');
    expect(daemon.logged).not.toContain(TOKEN);
    expect(daemon.logged).not.toContain(BASE_URL);

    global.fetch = jest.fn(async () => {
      throw new Error(`connect failed ${BASE_URL}?token=${TOKEN}`);
    }) as typeof fetch;
    const network = await loggedFailure(installOnRemoteSimulatorAsync({ deviceId: 'eas:s1', url: BUILD_URL }));
    expect(network.error.code).toBe('REMOTE_SIMULATOR_UNAVAILABLE');
    expect(network.logged).not.toContain(TOKEN);
  });

  it('reports the session as unavailable when it is not running or has no controller', async () => {
    const calls = mockFetch(() => healthy);
    sdk.getDeviceRunSessionController.mockResolvedValue(controller({ status: 'STOPPED', remoteConfig: null }) as any);
    await expect(
      installOnRemoteSimulatorAsync({ deviceId: 'eas:s1', url: BUILD_URL })
    ).rejects.toMatchObject({ code: 'REMOTE_SIMULATOR_UNAVAILABLE' });
    expect(calls).toHaveLength(0);
  });

  it('refuses a controller that speaks another protocol version, before it installs', async () => {
    sdk.getDeviceRunSessionController.mockResolvedValue(controller() as any);
    const calls = mockFetch(() => ({ ok: true, rpcProtocolVersion: 3 }));
    await expect(
      installOnRemoteSimulatorAsync({ deviceId: 'eas:s1', url: BUILD_URL })
    ).rejects.toThrow('Update Orbit');
    expect(calls).toHaveLength(1);
  });
});

describe(listRemoteSimulatorOptionsAsync, () => {
  const build = (id: string, overrides: object = {}) => ({
    node: {
      __typename: 'Build',
      id,
      appBuildVersion: '7',
      appVersion: '1.2.0',
      createdAt: '2026-11-01T00:00:00.000Z',
      developmentClient: false,
      isForIosSimulator: true,
      platform: 'IOS',
      ...overrides,
    },
  });

  it('returns device models, installable builds and the newest Expo Go versions', async () => {
    sdk.getRemoteSimulatorOptions.mockResolvedValue({
      deviceRunSessions: {
        profiles: {
          ios: { devices: [{ identifier: 'iPhone 17', displayName: 'iPhone 17' }] },
          android: { devices: [{ identifier: 'pixel_9', displayName: 'Pixel 9' }] },
        },
      },
      expoGoBuild: {
        supportedSdkVersions: [
          { sdkVersion: '54.0.0', isLatest: false, isBeta: false, isDeprecated: true },
          { sdkVersion: '55.0.0', isLatest: false, isBeta: false, isDeprecated: false },
          { sdkVersion: '56.0.0', isLatest: true, isBeta: false, isDeprecated: false },
          { sdkVersion: '57.0.0', isLatest: false, isBeta: true, isDeprecated: false },
        ],
      },
      app: {
        byId: {
          id: 'app',
          iosBuilds: {
            edges: [
              build('sim', { runtime: { version: '1.2.0' }, developmentClient: true }),
              build('device', { isForIosSimulator: false }),
            ],
          },
          androidBuilds: {
            edges: [
              build('apk', { artifacts: { applicationArchiveUrl: `https://expo.dev/a.apk?token=${TOKEN}` } }),
              build('aab', { artifacts: { applicationArchiveUrl: 'https://expo.dev/a.aab' } }),
            ],
          },
        },
      },
    } as any);

    const options = await listRemoteSimulatorOptionsAsync({ appId: 'app' });

    expect(options.devices).toEqual({
      ios: [{ id: 'iPhone 17', label: 'iPhone 17' }],
      android: [{ id: 'pixel_9', label: 'Pixel 9' }],
    });
    expect(options.builds.ios).toEqual([
      { id: 'sim', label: '#7 (1.2.0) · Dev Client', createdAt: '2026-11-01T00:00:00.000Z' },
    ]);
    expect(options.builds.android.map(({ id }) => id)).toEqual(['apk']);
    expect(options.expoGoSdkVersions.map(({ label }) => label)).toEqual([
      'SDK 57 (beta)',
      'SDK 56 (latest)',
      'SDK 55',
    ]);
    // The archive URL is signed, so it stays in the CLI.
    expect(JSON.stringify(options)).not.toContain(TOKEN);
  });
});
