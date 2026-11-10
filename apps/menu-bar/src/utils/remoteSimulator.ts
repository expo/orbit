import {
  REMOTE_SIMULATOR_ID_PREFIX,
  RemoteSimulator,
  RemoteSimulatorAccount,
} from 'common-types/build/devices';

type App = { id: string; slug: string; ownerAccount: { name: string } };

export type RemoteSimulatorProject = { id: string; label: string };

/**
 * The projects a new Expo Simulators session can run under: the user's pinned and recent projects
 * that belong to an account with access. The project used last comes first, so it is the
 * picker's default.
 */
export function getRemoteSimulatorProjects({
  remoteAccounts,
  accounts,
  pinnedApps,
  lastAppId,
}: {
  remoteAccounts: RemoteSimulatorAccount[];
  accounts?: { id: string; appsPaginated: { edges: { node: App }[] } }[] | null;
  pinnedApps?: App[] | null;
  lastAppId?: string;
}): RemoteSimulatorProject[] {
  const accountIds = new Set(remoteAccounts.map(({ id }) => id));
  const accountNames = new Set(remoteAccounts.map(({ name }) => name));

  const apps = [
    ...(pinnedApps ?? []).filter((app) => accountNames.has(app.ownerAccount.name)),
    ...(accounts ?? [])
      .filter((account) => accountIds.has(account.id))
      .flatMap((account) => account.appsPaginated.edges.map(({ node }) => node)),
  ];

  const projects = new Map<string, RemoteSimulatorProject>();
  for (const app of apps) {
    projects.set(app.id, { id: app.id, label: `${app.ownerAccount.name}/${app.slug}` });
  }
  return [...projects.values()].sort(
    (a, b) => Number(b.id === lastAppId) - Number(a.id === lastAppId)
  );
}

/** The session a `boot-device` output line announces, as a row that is still starting. */
export function parseStartedRemoteSimulator(
  output: string,
  platform: 'ios' | 'android',
  project: RemoteSimulatorProject
): RemoteSimulator | undefined {
  let sessionId: unknown;
  try {
    sessionId = JSON.parse(output).remoteSimulatorSessionId;
  } catch {
    return undefined;
  }
  if (typeof sessionId !== 'string') {
    return undefined;
  }
  const [accountName, projectSlug] = project.label.split('/');
  return {
    id: `${REMOTE_SIMULATOR_ID_PREFIX}${sessionId}`,
    // The name the CLI gives the session, so the row does not change at the next refresh.
    name: 'Started from Orbit',
    osType: platform === 'android' ? 'Android' : 'iOS',
    deviceType: 'remote',
    state: 'Starting',
    installable: true,
    accountName,
    projectSlug,
  };
}

/** The session's page that shows the device. It needs a browser login and carries no token. */
export function getRemoteSimulatorPreviewUrl(device: RemoteSimulator): string | undefined {
  if (!device.accountName || !device.projectSlug) {
    return undefined;
  }
  const sessionId = device.id.slice(REMOTE_SIMULATOR_ID_PREFIX.length);
  return `https://expo.dev/accounts/${device.accountName}/projects/${device.projectSlug}/simulator-sessions/${sessionId}/preview`;
}

/** The choices of the "Create new simulator" window, besides the platform and the project. */
export type RemoteSimulatorStartOptions = {
  name?: string;
  deviceIdentifier?: string;
  buildId?: string;
  expoGo?: boolean;
  sdkVersion?: string;
  archiveUrl?: string;
  launchArgs?: string[];
  tags?: string[];
  /** `agent-device`, `argent` or `appium`. */
  sessionType?: string;
};

/** The "Create new simulator" window sends this event to the popover, which starts the session. */
export const START_REMOTE_SIMULATOR_EVENT = 'startRemoteSimulator';
export type StartRemoteSimulatorRequest = {
  platform: 'ios' | 'android';
  project: RemoteSimulatorProject;
  options: RemoteSimulatorStartOptions;
};

type Parsed = { value: string[]; error?: undefined } | { value?: undefined; error: string };

// The limits are the ones expo.dev checks.
const MAX_LAUNCH_ARGS = 100;
const MAX_TAGS = 16;
const MAX_TAG_LENGTH = 64;

/** Splits launch arguments on spaces. Quotes and a backslash keep a space inside an argument. */
export function parseLaunchArgs(input: string): Parsed {
  const value: string[] = [];
  let current = '';
  let quote: string | undefined;
  let isEscaped = false;
  let hasToken = false;
  for (const character of input.trim()) {
    if (isEscaped) {
      current += character;
      isEscaped = false;
    } else if (character === '\\') {
      isEscaped = true;
      hasToken = true;
    } else if (quote) {
      if (character === quote) {
        quote = undefined;
      } else {
        current += character;
      }
    } else if (character === '"' || character === "'") {
      quote = character;
      hasToken = true;
    } else if (/\s/.test(character)) {
      if (hasToken) {
        value.push(current);
      }
      current = '';
      hasToken = false;
    } else {
      current += character;
      hasToken = true;
    }
  }
  if (quote || isEscaped) {
    return { error: 'The launch arguments have a quote or a backslash that is not closed.' };
  }
  if (hasToken) {
    value.push(current);
  }
  if (value.length > MAX_LAUNCH_ARGS) {
    return { error: `Use ${MAX_LAUNCH_ARGS} launch arguments or fewer.` };
  }
  return { value };
}

/** Splits tags on commas. Tags are saved in lowercase, without duplicates. */
export function parseTags(input: string): Parsed {
  const value = [
    ...new Set(
      input
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
  if (value.length > MAX_TAGS) {
    return { error: `Use ${MAX_TAGS} tags or fewer.` };
  }
  if (value.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    return { error: `Each tag must be ${MAX_TAG_LENGTH} characters or fewer.` };
  }
  return { value };
}

/** A short age such as `5m ago`, `3h ago`, `2d ago` or `2w ago`. */
export function formatRelativeTime(isoDate: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - new Date(isoDate).getTime()) / 60000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return days < 14 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}
