import { apolloClient } from '../api/ApolloClient';
import {
  StopDeviceRunSessionDocument,
  StopDeviceRunSessionMutation,
  StopDeviceRunSessionMutationVariables,
} from '../generated/graphql';
import Alert from '../modules/Alert';
import MenuBarModule from '../modules/MenuBarModule';
import { getCloudSimulatorSessionIds, saveCloudSimulatorSessionIds } from '../modules/Storage';

/**
 * Quitting Orbit does not stop a cloud simulator — it keeps running on EAS and
 * keeps billing. The persisted ids are pruned whenever a session ends, so reading
 * them is enough to warn without a network round trip on the quit path.
 *
 * This only covers the popover's Quit item. A native ⌘Q still bypasses it, which
 * is why sessions also carry a server-side time limit.
 */
export function quitWithCloudSimulatorGuard() {
  const activeSessionIds = getCloudSimulatorSessionIds();

  if (!activeSessionIds.length) {
    MenuBarModule.exitApp();
    return;
  }

  const count = activeSessionIds.length;
  Alert.alert(
    count === 1 ? 'A cloud simulator is still running' : `${count} cloud simulators are running`,
    'They run on EAS and keep billing until they are stopped. Quitting Orbit does not stop them.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop and quit',
        onPress: async () => {
          await Promise.all(
            activeSessionIds.map((deviceRunSessionId) =>
              apolloClient
                .mutate<StopDeviceRunSessionMutation, StopDeviceRunSessionMutationVariables>({
                  mutation: StopDeviceRunSessionDocument,
                  variables: { deviceRunSessionId },
                })
                // Best effort: a session that will not stop should not block the quit.
                .catch(() => undefined)
            )
          );
          saveCloudSimulatorSessionIds([]);
          MenuBarModule.exitApp();
        },
      },
      { text: 'Quit anyway', onPress: () => MenuBarModule.exitApp() },
    ]
  );
}
