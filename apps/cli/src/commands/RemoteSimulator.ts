import { InternalError } from 'common-types';
import {
  REMOTE_SIMULATOR_ID_PREFIX,
  RemoteSimulator,
  RemoteSimulatorList,
  RemoteSimulatorOption,
  RemoteSimulatorOptions,
} from 'common-types/build/devices';

import { assertTrustedSource } from './TrustedSources';
import { graphqlSdk } from '../api/GraphqlClient';
import {
  AppPlatform,
  DeviceRunSessionStatus,
  DeviceRunSessionType,
  RemoteSimulatorBuildFragment,
} from '../graphql/generated/graphql';
import { getSessionSecret } from '../storage';

// The session's controller URL and token are secrets, and the menu bar logs every line, result
// and error of a CLI command. So nothing in this file prints or returns them, and every failure
// is rethrown as a new error with a fixed message: the original error is dropped, because its
// message or stack can echo a response that holds them.

/** The agent-device daemon protocol this file was tested against (GET /health). */
const SUPPORTED_RPC_PROTOCOL_VERSION = 2;
/** Expo Simulators is available on every paid plan. This is the plan ID of the Free plan. */
const FREE_PLAN_ID = 'price_free';
const POLL_INTERVAL_MS = 5000;
/** Queue wait plus boot. A boot alone can take 15 minutes. */
const BOOT_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_MAX_RUN_TIME_MINUTES = 30;

type RemotePlatform = 'ios' | 'android';

export function isRemoteSimulatorId(id: string | undefined): boolean {
  return !!id && id.startsWith(REMOTE_SIMULATOR_ID_PREFIX);
}

function sessionIdFromDeviceId(deviceId: string): string {
  return deviceId.slice(REMOTE_SIMULATOR_ID_PREFIX.length);
}

function failed(message: string) {
  return new InternalError('REMOTE_SIMULATOR_FAILED', message);
}

function unavailable() {
  return new InternalError(
    'REMOTE_SIMULATOR_UNAVAILABLE',
    'Orbit could not reach this Expo Simulators session. It may have stopped or lost its connection.'
  );
}

/**
 * Runs an EAS API call that never selects `remoteConfig`. The server's own message (plan limit,
 * no permission) is safe to show for these, so it is kept.
 */
async function eas<T>(what: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const serverMessage = (error as { response?: { errors?: { message?: unknown }[] } })?.response
      ?.errors?.[0]?.message;
    throw failed(typeof serverMessage === 'string' ? `${what}: ${serverMessage}` : `${what}.`);
  }
}

export async function listRemoteSimulatorsAsync(): Promise<RemoteSimulatorList> {
  if (!getSessionSecret()) {
    return { devices: [], accounts: [] };
  }

  const { meUserActor } = await eas('Could not list Expo Simulators accounts', () =>
    graphqlSdk.getRemoteSimulatorAccounts()
  );
  const accounts = (meUserActor?.accounts ?? [])
    .filter(({ subscription }) => !!subscription?.planId && subscription.planId !== FREE_PLAN_ID)
    .map(({ id, name }) => ({ id, name }));
  if (!meUserActor || !accounts.length) {
    return { devices: [], accounts: [] };
  }

  const devices: RemoteSimulator[] = [idleRemoteSimulator('ios'), idleRemoteSimulator('android')];

  const sessionsPerAccount = await Promise.all(
    accounts.map(async (account) => {
      const sessions: RemoteSimulator[] = [];
      let after: string | undefined;
      do {
        const { account: result } = await eas('Could not list Expo Simulators sessions', () =>
          graphqlSdk.getAccountDeviceRunSessions({ accountId: account.id, after })
        );
        const page = result.byId.deviceRunSessionsPaginated;
        for (const { node } of page.edges) {
          if (node.initiatingActor?.id !== meUserActor.id) {
            continue;
          }
          sessions.push({
            id: `${REMOTE_SIMULATOR_ID_PREFIX}${node.id}`,
            name: node.name || node.app.slug,
            osType: node.platform === AppPlatform.Android ? 'Android' : 'iOS',
            deviceType: 'remote',
            state: node.status === DeviceRunSessionStatus.InProgress ? 'Booted' : 'Starting',
            installable: node.type === DeviceRunSessionType.AgentDevice,
            accountName: node.app.ownerAccount.name,
            projectSlug: node.app.slug,
            deviceIdentifier: node.deviceIdentifier ?? undefined,
            // A session that is not ready yet has no start time.
            startedAt: node.startedAt ?? node.createdAt ?? undefined,
          });
        }
        after = page.pageInfo.hasNextPage ? (page.pageInfo.endCursor ?? undefined) : undefined;
      } while (after);
      return sessions;
    })
  );

  return { devices: devices.concat(...sessionsPerAccount), accounts };
}

function idleRemoteSimulator(platform: RemotePlatform): RemoteSimulator {
  return {
    id: `${REMOTE_SIMULATOR_ID_PREFIX}${platform}`,
    name: 'Expo Simulators',
    osType: platform === 'android' ? 'Android' : 'iOS',
    deviceType: 'remote',
    state: 'Shutdown',
  };
}

const SESSION_TYPES: Record<string, DeviceRunSessionType> = {
  'agent-device': DeviceRunSessionType.AgentDevice,
  argent: DeviceRunSessionType.Argent,
  appium: DeviceRunSessionType.Appium,
  'web-preview-only': DeviceRunSessionType.WebPreviewOnly,
};
/** The builds the "Create new simulator" window offers for each platform. */
const MAX_BUILD_OPTIONS = 10;
/** The Expo Go versions the window offers, as on expo.dev. */
const MAX_EXPO_GO_OPTIONS = 3;

function isApkUrl(url?: string | null): boolean {
  try {
    return !!url && new URL(url).pathname.toLowerCase().endsWith('.apk');
  } catch {
    return false;
  }
}

// The labels follow the "Create new simulator" dialog on expo.dev.
function buildOption(build: RemoteSimulatorBuildFragment): RemoteSimulatorOption {
  const buildNumber = build.appBuildVersion ?? 'unknown';
  const runtimeVersion = build.runtime?.version ?? build.runtimeVersion;
  const version =
    build.buildMode === 'LOCAL'
      ? 'Local'
      : runtimeVersion
        ? `#${buildNumber} (${/^[0-9a-f]{12,}$/i.test(runtimeVersion) ? `${runtimeVersion.slice(0, 5)}…` : runtimeVersion})`
        : build.appVersion
          ? `#${buildNumber} · v${build.appVersion}`
          : `#${buildNumber}`;
  return {
    id: build.id,
    label: `${version} · ${build.developmentClient ? 'Dev Client' : 'Release'}`,
    createdAt: build.createdAt,
  };
}

/** The device models, builds and Expo Go versions that a new session can start with. */
export async function listRemoteSimulatorOptionsAsync({
  appId,
}: {
  appId: string;
}): Promise<RemoteSimulatorOptions> {
  const data = await eas('Could not read the Expo Simulators options', () =>
    graphqlSdk.getRemoteSimulatorOptions({ appId })
  );
  const device = ({ identifier, displayName }: { identifier: string; displayName: string }) => ({
    id: identifier,
    label: displayName,
  });
  const builds = (
    edges: { node: { __typename?: string } }[],
    isInstallable: (build: RemoteSimulatorBuildFragment) => boolean
  ) =>
    edges
      .map(({ node }) => node)
      .filter(
        (node): node is RemoteSimulatorBuildFragment & { __typename: 'Build' } =>
          node.__typename === 'Build'
      )
      .filter(isInstallable)
      .slice(0, MAX_BUILD_OPTIONS)
      .map(buildOption);
  const { profiles } = data.deviceRunSessions;

  return {
    devices: {
      ios: profiles.ios.devices.map(device),
      android: profiles.android.devices.map(device),
    },
    builds: {
      ios: builds(data.app.byId.iosBuilds.edges, (build) => build.isForIosSimulator),
      // Only the label leaves this function: the archive URL is signed.
      android: builds(data.app.byId.androidBuilds.edges, (build) =>
        isApkUrl(build.artifacts?.applicationArchiveUrl)
      ),
    },
    expoGoSdkVersions: data.expoGoBuild.supportedSdkVersions
      .slice(-MAX_EXPO_GO_OPTIONS)
      .reverse()
      .map((version) => {
        const qualifiers = [
          version.isLatest && 'latest',
          version.isBeta && 'beta',
          version.isDeprecated && 'deprecated',
        ].filter(Boolean);
        return {
          id: version.sdkVersion,
          label: `SDK ${Number.parseInt(version.sdkVersion, 10)}${
            qualifiers.length ? ` (${qualifiers.join(', ')})` : ''
          }`,
        };
      }),
  };
}

type BootRemoteSimulatorOptions = {
  platform: RemotePlatform;
  appId?: string;
  archiveUrl?: string;
  openUrl?: string;
  maxRunTime?: string | number;
  name?: string;
  /** A device model from `listRemoteSimulatorOptionsAsync`. */
  deviceIdentifier?: string;
  /** An EAS build to install. Not with `archiveUrl` or `expoGo`. */
  buildId?: string;
  /** Install Expo Go. Not with `archiveUrl` or `buildId`. */
  expoGo?: boolean;
  sdkVersion?: string;
  /** JSON arrays of strings. */
  launchArgs?: string;
  tags?: string;
  /**
   * `agent-device` (the default), `argent`, `appium` or `web-preview-only` (no controller). Orbit
   * installs builds only through agent-device.
   */
  sessionType?: string;
};

function parseStringList(value: string | undefined, option: string): string[] {
  if (!value) {
    return [];
  }
  try {
    const list = JSON.parse(value);
    if (Array.isArray(list) && list.every((item) => typeof item === 'string')) {
      return list;
    }
  } catch {}
  throw failed(`${option} must be a JSON array of strings.`);
}

export async function bootRemoteSimulatorAsync({
  platform,
  appId,
  archiveUrl,
  openUrl,
  maxRunTime,
  name,
  deviceIdentifier,
  buildId,
  expoGo,
  sdkVersion,
  launchArgs,
  tags,
  sessionType = 'agent-device',
}: BootRemoteSimulatorOptions) {
  if (!appId) {
    throw failed('An Expo Simulators session needs a project. Pass --app-id.');
  }
  if (archiveUrl) {
    assertTrustedSource(archiveUrl);
  }
  const maxRunTimeMinutes = Number(maxRunTime ?? DEFAULT_MAX_RUN_TIME_MINUTES);
  if (!Number.isInteger(maxRunTimeMinutes) || maxRunTimeMinutes <= 0) {
    throw failed('--max-run-time must be a whole number of minutes.');
  }

  if ([archiveUrl, buildId, expoGo].filter(Boolean).length > 1) {
    throw failed('Pass only one of --archive-url, --build-id and --expo-go.');
  }
  const type = SESSION_TYPES[sessionType];
  if (!type) {
    throw failed('--session-type must be agent-device, argent, appium or web-preview-only.');
  }
  const launchArgsList = parseStringList(launchArgs, '--launch-args');
  const tagsList = parseStringList(tags, '--tags');
  const hasBuild = !!(archiveUrl || buildId || expoGo);

  // Never retried: a second create is a second paid session.
  const created = await eas('Could not start the Expo Simulators session', () =>
    graphqlSdk.createDeviceRunSession({
      deviceRunSessionInput: {
        appId,
        platform: platform === 'android' ? AppPlatform.Android : AppPlatform.Ios,
        type,
        maxRunTimeMinutes,
        name: name?.trim() || 'Started from Orbit',
        ...(deviceIdentifier
          ? { [platform === 'android' ? 'android' : 'ios']: { deviceIdentifier } }
          : {}),
        ...(archiveUrl ? { applicationArchiveUrl: archiveUrl } : {}),
        ...(buildId ? { buildId } : {}),
        ...(expoGo ? { expoGo: true, ...(sdkVersion ? { sdkVersion } : {}) } : {}),
        ...(hasBuild && openUrl ? { openUrl } : {}),
        ...(hasBuild && launchArgsList.length ? { launchArgs: launchArgsList } : {}),
        ...(tagsList.length ? { tags: tagsList } : {}),
      },
    })
  );
  const sessionId = created.deviceRunSession.createDeviceRunSession.id;
  // The menu bar reads this line to show and select the session while it starts.
  console.log(JSON.stringify({ remoteSimulatorSessionId: sessionId }));

  let timedOut = false;
  try {
    const deadline = Date.now() + BOOT_TIMEOUT_MS;
    for (;;) {
      // A failed status request, for example one network error, does not end the wait: the
      // session can still start, and the user waited for it. The deadline ends the wait.
      const status = await eas('Could not read the Expo Simulators session', () =>
        graphqlSdk.getDeviceRunSessionStatus({ deviceRunSessionId: sessionId })
      ).then(
        ({ deviceRunSessions }) => deviceRunSessions.byId.status,
        () => undefined
      );
      if (status === DeviceRunSessionStatus.InProgress) {
        return { sessionId };
      }
      if (status === DeviceRunSessionStatus.Errored || status === DeviceRunSessionStatus.Stopped) {
        throw failed('The Expo Simulators session stopped before it was ready.');
      }
      if (Date.now() > deadline) {
        timedOut = true;
        throw failed('The Expo Simulators session did not start in 30 minutes.');
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  } catch (error) {
    // A session that is not ready still bills once it starts, so do not leave it behind. The
    // message says whether the stop worked.
    const stopped = await graphqlSdk
      .ensureDeviceRunSessionStopped({ deviceRunSessionId: sessionId })
      .then(
        () => true,
        () => false
      );
    if (error instanceof Error && !stopped) {
      error.message += ' Orbit could not stop it. It can still run: stop it on expo.dev.';
    } else if (error instanceof Error && timedOut) {
      error.message += ' Orbit stopped it.';
    }
    throw error;
  }
}

export async function stopRemoteSimulatorAsync({ id }: { id: string }) {
  const deviceRunSessionId = isRemoteSimulatorId(id) ? sessionIdFromDeviceId(id) : id;
  const result = await eas('Could not stop the Expo Simulators session', () =>
    graphqlSdk.ensureDeviceRunSessionStopped({ deviceRunSessionId })
  );
  return { status: result.deviceRunSession.ensureDeviceRunSessionStopped.status };
}

type InstallOnRemoteSimulatorOptions = {
  deviceId: string;
  url: string;
  launchUrl?: string;
};

export async function installOnRemoteSimulatorAsync({
  deviceId,
  url,
  launchUrl,
}: InstallOnRemoteSimulatorOptions) {
  assertTrustedSource(url);

  let controller: { baseUrl: string; token: string; platform: RemotePlatform };
  try {
    const { deviceRunSessions } = await graphqlSdk.getDeviceRunSessionController({
      deviceRunSessionId: sessionIdFromDeviceId(deviceId),
    });
    const { status, platform, remoteConfig } = deviceRunSessions.byId;
    if (
      status !== DeviceRunSessionStatus.InProgress ||
      remoteConfig?.__typename !== 'AgentDeviceRunSessionRemoteConfig'
    ) {
      throw new Error('not controllable');
    }
    controller = {
      baseUrl: remoteConfig.agentDeviceRemoteSessionUrl.replace(/\/+$/, ''),
      token: remoteConfig.agentDeviceRemoteSessionToken,
      platform: platform === AppPlatform.Android ? 'android' : 'ios',
    };
  } catch {
    throw unavailable();
  }

  let protocolVersion: unknown;
  try {
    const response = await fetch(`${controller.baseUrl}/health`, {
      signal: AbortSignal.timeout(30_000),
    });
    protocolVersion = response.ok ? (await response.json())?.rpcProtocolVersion : undefined;
  } catch {
    throw unavailable();
  }
  if (protocolVersion === undefined) {
    throw unavailable();
  }
  if (protocolVersion !== SUPPORTED_RPC_PROTOCOL_VERSION) {
    throw failed(
      'This Expo Simulators session uses a controller version that this Orbit version does not support. Update Orbit.'
    );
  }

  const flags = { platform: controller.platform };
  const installed = await callControllerAsync(
    controller,
    'agent_device.install_from_source',
    { platform: controller.platform, source: { kind: 'url', url } },
    10 * 60 * 1000
  );
  if (!installed.ok) {
    throw failed(
      `The build could not be installed in the Expo Simulators session${describeCode(installed.code)}. If it is not an iOS simulator build or an Android APK, select a local device.`
    );
  }
  const launchTarget = installed.data.launchTarget ?? installed.data.bundleId;

  if (launchUrl) {
    const opened = await callControllerAsync(controller, 'agent_device.command', {
      command: 'open',
      positionals: [launchUrl],
      flags,
    });
    if (opened.ok) {
      return;
    }
    // Fall back to a normal launch, as a local install does.
  }
  if (typeof launchTarget !== 'string') {
    throw failed(
      'The build was installed, but the Expo Simulators session did not report which app to open.'
    );
  }
  const opened = await callControllerAsync(controller, 'agent_device.command', {
    command: 'open',
    positionals: [launchTarget],
    flags,
  });
  if (!opened.ok) {
    throw failed(
      `The build was installed, but it could not be opened in the Expo Simulators session${describeCode(opened.code)}.`
    );
  }
}

type ControllerResult = { ok: true; data: Record<string, unknown> } | { ok: false; code?: string };

function describeCode(code: string | undefined) {
  return code ? ` (${code})` : '';
}

async function callControllerAsync(
  controller: { baseUrl: string; token: string },
  method: string,
  params: Record<string, unknown>,
  timeoutMs = 2 * 60 * 1000
): Promise<ControllerResult> {
  let body: any;
  try {
    const response = await fetch(`${controller.baseUrl}/rpc`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${controller.token}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: method, method, params }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    body = await response.json();
  } catch {
    throw unavailable();
  }
  // Only an error code that looks like a constant is passed on; messages can hold URLs.
  const code = (value: unknown) =>
    typeof value === 'string' && /^[A-Z_]{1,40}$/.test(value) ? value : undefined;
  if (body?.error) {
    if (body.error?.data?.code === 'UNAUTHORIZED') {
      throw unavailable();
    }
    return { ok: false, code: code(body.error?.data?.code) };
  }
  if (body?.result?.ok === true) {
    return { ok: true, data: body.result.data ?? {} };
  }
  return { ok: false, code: code(body?.result?.error?.code) };
}
