import { RemoteSimulator } from 'common-types/build/devices';

import {
  listRemoteSimulatorsAsync,
  stopRemoteSimulatorAsync,
} from '../commands/remoteSimulatorAsync';
import Alert from '../modules/Alert';
import { sessionSecretStorageKey, storage } from '../modules/Storage';

const LIST_TIMEOUT_MS = 3000;

// The sessions that run now, for a caller that has no list. When the request fails or takes
// too long, the result is empty and the action runs with no question.
async function listRunningSessionsAsync() {
  if (!storage.getString(sessionSecretStorageKey)) {
    return [];
  }
  try {
    const list = await Promise.race([
      listRemoteSimulatorsAsync(),
      new Promise<never>((_, reject) => setTimeout(reject, LIST_TIMEOUT_MS)),
    ]);
    return list.devices.filter(({ state }) => state !== 'Shutdown');
  } catch {
    return [];
  }
}

/**
 * Runs `action`, which makes Orbit lose its remote sessions: quit or log out. A remote session
 * keeps running, and uses the plan, after that. So when sessions run, this asks first. It
 * runs `action` after "stop" only when every session stopped.
 */
export async function leaveRemoteSessionsAsync({
  label,
  known,
  action,
}: {
  /** The name of the action on its button, for example `Quit`. */
  label: string;
  /** The sessions of the popover's list. A window without that list leaves this out. */
  known?: RemoteSimulator[];
  action: () => void;
}) {
  const sessions = known ?? (await listRunningSessionsAsync());
  if (!sessions.length) {
    action();
    return;
  }
  const one = sessions.length === 1;
  Alert.alert(
    one
      ? 'A remote session is still running'
      : `${sessions.length} remote sessions are still running`,
    `${one ? 'It keeps' : 'They keep'} running, and ${one ? 'uses' : 'use'} your Expo plan, until you stop ${one ? 'it' : 'them'}. This includes sessions that you started on expo.dev or with EAS CLI.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: label, onPress: action },
      {
        text: `Stop ${one ? 'session' : 'sessions'} and ${label.toLowerCase()}`,
        onPress: async () => {
          const results = await Promise.allSettled(
            sessions.map(({ id }) => stopRemoteSimulatorAsync(id))
          );
          const failed = results.filter(({ status }) => status === 'rejected').length;
          if (failed) {
            Alert.alert(
              failed === 1
                ? 'A remote session did not stop'
                : `${failed} remote sessions did not stop`,
              'Stop the sessions on expo.dev, or try again.'
            );
            return;
          }
          action();
        },
      },
    ]
  );
}
