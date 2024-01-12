import { EventEmitter } from 'expo-modules-core';

import MenuBarModule from './src/MenuBarModule';
import { convertCliErrorObjectToError } from '../../src/utils/helpers';

const emitter = new EventEmitter(MenuBarModule);

let listenerCounter = 0;
async function runCli(command: string, args: string[], callback?: (status: string) => void) {
  const id = listenerCounter++;
  const filteredCallback = (event: { listenerId: number; output: string }) => {
    if (event.listenerId !== id) {
      return;
    }
    callback?.(event.output);
  };
  const listener = emitter.addListener('onCLIOutput', filteredCallback);
  try {
    const result = await MenuBarModule.runCli(command, args, id);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      // Original error from CLI is a stringified JSON object
      throw convertCliErrorObjectToError(JSON.parse(error.message));
    }
    throw error;
  } finally {
    listener.remove();
  }
}

export default {
  appVersion: MenuBarModule.appVersion,
  buildVersion: MenuBarModule.buildVersion,
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
};
