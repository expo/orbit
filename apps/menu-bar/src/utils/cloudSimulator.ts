import {
  DeviceRunSessionDataFragment,
  DeviceRunSessionStatus,
  JobRunStatus,
} from '../generated/graphql';

export const DEVICE_RUN_SESSIONS_FEATURE_GATE = 'device-run-sessions';

/** How long to wait for a session to hand back a preview URL. Matches eas-cli. */
export const SESSION_READY_TIMEOUT_MS = 15 * 60 * 1000;
export const SESSION_POLL_INTERVAL_MS = 5000;

export type CloudSimulatorSession = DeviceRunSessionDataFragment;

/**
 * Both session types that can render a preview expose it under a different field.
 * `AGENT_DEVICE` runs serve-sim alongside its daemon on iOS, so it has a
 * `webPreviewUrl`; a `SERVE_SIM` session is preview-only. Android sessions have
 * no preview at all, which is why the feature is iOS-first.
 */
export function getPreviewUrl(session: CloudSimulatorSession): string | undefined {
  const remoteConfig = session.remoteConfig;
  if (!remoteConfig) {
    return undefined;
  }

  switch (remoteConfig.__typename) {
    case 'AgentDeviceRunSessionRemoteConfig':
    case 'ArgentRunSessionRemoteConfig':
      return remoteConfig.webPreviewUrl ?? undefined;
    case 'ServeSimRunSessionRemoteConfig':
      return remoteConfig.previewUrl;
    default:
      return undefined;
  }
}

/** Connection details for the agent-device daemon, when the session exposes one. */
export function getAgentDeviceConnection(
  session: CloudSimulatorSession
): { url: string; token: string } | undefined {
  const remoteConfig = session.remoteConfig;
  if (remoteConfig?.__typename !== 'AgentDeviceRunSessionRemoteConfig') {
    return undefined;
  }

  return {
    url: remoteConfig.agentDeviceRemoteSessionUrl,
    token: remoteConfig.agentDeviceRemoteSessionToken,
  };
}

export function isSessionTerminal(session: CloudSimulatorSession): boolean {
  if (
    session.status === DeviceRunSessionStatus.Stopped ||
    session.status === DeviceRunSessionStatus.Errored
  ) {
    return true;
  }

  const jobRunStatus = session.turtleJobRun?.status;
  return (
    jobRunStatus === JobRunStatus.Errored ||
    jobRunStatus === JobRunStatus.Canceled ||
    jobRunStatus === JobRunStatus.Finished
  );
}

export function isSessionActive(session: CloudSimulatorSession): boolean {
  return !isSessionTerminal(session);
}

/**
 * Session names show up in `eas simulator:list` and on expo.dev, where they are a
 * single-line title in a narrow column. Keep them short and say what the session
 * is for; the table already shows the id, platform, and start time.
 */
export function buildSessionName(appSlug: string): string {
  const name = `Orbit — ${appSlug}`;
  return name.length > 50 ? `${name.slice(0, 49)}…` : name;
}

export function formatElapsedTime(startedAt: string | undefined | null, now: number): string {
  if (!startedAt) {
    return '—';
  }

  const elapsedMs = now - new Date(startedAt).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return '—';
  }

  const totalMinutes = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * serve-sim has no supported embed mode, so hiding its panels means targeting its
 * layout directly. This is deliberately conservative: it hides the side panels and
 * lets the framed device fill the window, and it is only applied in the frameless
 * layout. If the preview UI changes, the worst case is that the panels reappear —
 * the simulator itself keeps working.
 *
 * Replace this with a query parameter as soon as serve-sim exposes one.
 */
export const FRAMELESS_PREVIEW_CSS = `
  html, body, #root {
    background: transparent !important;
  }
  aside,
  [class*="sidebar"],
  [class*="Sidebar"],
  [class*="panel"],
  [class*="Panel"],
  [class*="toolbar"],
  [class*="Toolbar"] {
    display: none !important;
  }
`;
