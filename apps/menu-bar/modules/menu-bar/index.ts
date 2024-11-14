import { CodedError } from 'expo-modules-core';

import MenuBarModule, { emitter } from './src/MenuBarModule';
import Alert from '../../src/modules/Alert';
import { Logs } from '../../src/modules/Storage';
import { convertCliErrorObjectToError } from '../../src/utils/helpers';

const logs = new Logs();

let hasShownCliErrorAlert = false;
let listenerCounter = 0;
async function runCli(command: string, args: string[], callback?: (status: string) => void) {
  const id = listenerCounter++;
  const filteredCallback = (event: { listenerId: number; output: string }) => {
    if (event.listenerId !== id) {
      return;
    }
    logs.push({ command, info: event.output });
    callback?.(event.output);
  };
  const listener = emitter.addListener('onCLIOutput', filteredCallback);
  try {
    const result = await MenuBarModule.runCli(command, args, id);
    logs.push({ command, info: result });
    return result;
  } catch (error) {
    if (error instanceof CodedError && error.code === 'ERR_INTERNAL_CLI') {
      if (!hasShownCliErrorAlert) {
        Alert.alert(
          'Something went wrong',
          'Unable to invoke internal CLI, please reinstall Orbit.'
        );
        hasShownCliErrorAlert = true;
      }
    } else if (error instanceof Error) {
      // Original error from CLI is a stringified JSON object
      const cliError = convertCliErrorObjectToError(JSON.parse(error.message));
      logs.push({ command, info: cliError.message });

      throw cliError;
    }
    throw error;
  } finally {
    listener.remove();
  }
}

export default {
  appVersion: MenuBarModule.appVersion,
  buildVersion: MenuBarModule.buildVersion,
  initialScreenSize: MenuBarModule.initialScreenSize,
  homedir: MenuBarModule.homedir,
  exitApp: () => MenuBarModule.exitApp(),
  openSystemSettingsLoginItems: () => MenuBarModule.openSystemSettingsLoginItems(),
  runCli,
  runGenericCommand: async (
    command: string,
    args: string[],
    callback: (status: string) => void
  ) => {
    const listener = emitter.addListener('onNewCommandLine', callback);
    const result = await MenuBarModule.runCommand(command, args);
    listener.remove();
    return result;
  },
  setLoginItemEnabled: (enabled: boolean) => MenuBarModule.setLoginItemEnabled(enabled),
  setEnvVars: (envVars: { [key: string]: string }) => MenuBarModule.setEnvVars(envVars),
  showMultiOptionAlert: (title: string, message: string, options: string[]) =>
    MenuBarModule.showMultiOptionAlert(title, message, options),
  openPopover: () => MenuBarModule.openPopover(),
  closePopover: () => MenuBarModule.closePopover(),
  logs,
};
