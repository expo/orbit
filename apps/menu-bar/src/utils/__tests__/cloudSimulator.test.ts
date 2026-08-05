import {
  AppPlatform,
  DeviceRunSessionStatus,
  DeviceRunSessionType,
  JobRunStatus,
} from '../../generated/graphql';
import {
  CloudSimulatorSession,
  buildSessionName,
  formatElapsedTime,
  getAgentDeviceConnection,
  getPreviewUrl,
  isSessionActive,
  isSessionTerminal,
} from '../cloudSimulator';

function createSession(overrides: Partial<CloudSimulatorSession> = {}): CloudSimulatorSession {
  return {
    __typename: 'DeviceRunSession',
    id: 'session-1',
    name: 'Checkout flow screenshots',
    status: DeviceRunSessionStatus.InProgress,
    type: DeviceRunSessionType.AgentDevice,
    platform: AppPlatform.Ios,
    packageVersion: null,
    createdAt: '2026-08-04T10:00:00.000Z',
    startedAt: '2026-08-04T10:00:00.000Z',
    finishedAt: null,
    app: {
      __typename: 'App',
      id: 'app-1',
      slug: 'my-app',
      ownerAccount: { __typename: 'Account', id: 'account-1', name: 'acme' },
    },
    turtleJobRun: { __typename: 'JobRun', id: 'job-1', status: JobRunStatus.InProgress },
    remoteConfig: null,
    ...overrides,
  } as CloudSimulatorSession;
}

describe('getPreviewUrl', () => {
  it('returns nothing while the session is still booting', () => {
    expect(getPreviewUrl(createSession())).toBeUndefined();
  });

  it('reads webPreviewUrl from an agent-device session', () => {
    const session = createSession({
      remoteConfig: {
        __typename: 'AgentDeviceRunSessionRemoteConfig',
        agentDeviceRemoteSessionUrl: 'https://daemon.example',
        agentDeviceRemoteSessionToken: 'token',
        webPreviewUrl: 'https://preview.example',
      },
    });

    expect(getPreviewUrl(session)).toBe('https://preview.example');
  });

  it('reads previewUrl from a serve-sim session', () => {
    const session = createSession({
      type: DeviceRunSessionType.ServeSim,
      remoteConfig: {
        __typename: 'ServeSimRunSessionRemoteConfig',
        previewUrl: 'https://serve-sim.example',
      },
    });

    expect(getPreviewUrl(session)).toBe('https://serve-sim.example');
  });

  it('handles an agent-device session that has no preview, as on Android', () => {
    const session = createSession({
      platform: AppPlatform.Android,
      remoteConfig: {
        __typename: 'AgentDeviceRunSessionRemoteConfig',
        agentDeviceRemoteSessionUrl: 'https://daemon.example',
        agentDeviceRemoteSessionToken: 'token',
        webPreviewUrl: null,
      },
    });

    expect(getPreviewUrl(session)).toBeUndefined();
  });
});

describe('getAgentDeviceConnection', () => {
  it('returns the daemon URL and token for an agent-device session', () => {
    const session = createSession({
      remoteConfig: {
        __typename: 'AgentDeviceRunSessionRemoteConfig',
        agentDeviceRemoteSessionUrl: 'https://daemon.example',
        agentDeviceRemoteSessionToken: 'token',
        webPreviewUrl: 'https://preview.example',
      },
    });

    expect(getAgentDeviceConnection(session)).toEqual({
      url: 'https://daemon.example',
      token: 'token',
    });
  });

  it('returns nothing for a preview-only session', () => {
    const session = createSession({
      remoteConfig: {
        __typename: 'ServeSimRunSessionRemoteConfig',
        previewUrl: 'https://serve-sim.example',
      },
    });

    expect(getAgentDeviceConnection(session)).toBeUndefined();
  });
});

describe('isSessionTerminal', () => {
  it('treats a running session as active', () => {
    expect(isSessionTerminal(createSession())).toBe(false);
    expect(isSessionActive(createSession())).toBe(true);
  });

  it.each([DeviceRunSessionStatus.Stopped, DeviceRunSessionStatus.Errored])(
    'treats %s as terminal',
    (status) => {
      expect(isSessionTerminal(createSession({ status }))).toBe(true);
    }
  );

  // The session row can still read IN_PROGRESS after the underlying job run has
  // gone away, so the job run status has to be checked too.
  it.each([JobRunStatus.Errored, JobRunStatus.Canceled, JobRunStatus.Finished])(
    'treats a %s job run as terminal even while the session says IN_PROGRESS',
    (status) => {
      const session = createSession({
        turtleJobRun: { __typename: 'JobRun', id: 'job-1', status },
      });

      expect(isSessionTerminal(session)).toBe(true);
    }
  );

  it('treats a queued job run as active', () => {
    const session = createSession({
      status: DeviceRunSessionStatus.New,
      turtleJobRun: { __typename: 'JobRun', id: 'job-1', status: JobRunStatus.InQueue },
    });

    expect(isSessionActive(session)).toBe(true);
  });
});

describe('buildSessionName', () => {
  it('names the session after the project', () => {
    expect(buildSessionName('my-app')).toBe('Orbit — my-app');
  });

  it('keeps the name short enough for the expo.dev session list', () => {
    const name = buildSessionName('a-very-long-project-slug-that-keeps-going-and-going');
    expect(name.length).toBeLessThanOrEqual(50);
  });
});

describe('formatElapsedTime', () => {
  const now = new Date('2026-08-04T12:00:00.000Z').getTime();

  it('formats minutes', () => {
    expect(formatElapsedTime('2026-08-04T11:45:00.000Z', now)).toBe('15m');
  });

  it('formats hours and minutes', () => {
    expect(formatElapsedTime('2026-08-04T09:30:00.000Z', now)).toBe('2h 30m');
  });

  it('handles a session that has not started yet', () => {
    expect(formatElapsedTime(null, now)).toBe('—');
  });

  // Clock skew between the machine and EAS should not render a negative duration.
  it('handles a start time in the future', () => {
    expect(formatElapsedTime('2026-08-04T12:05:00.000Z', now)).toBe('—');
  });
});
