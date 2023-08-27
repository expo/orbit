import { NativeEventEmitter, NativeModule, NativeModules } from 'react-native';

type MenuBarModuleType = NativeModule & {
  exitApp(): void;
  openSystemSettingsLoginItems(): void;
  runCli: (command: string, args: string[], listenerId: number) => Promise<string>;
  runCommand: (command: string, args: string[]) => Promise<void>;
  setLoginItemEnabled: (enabled: boolean) => Promise<void>;
  setEnvVars: (envVars: { [key: string]: string }) => void;
};

type MenuBarModuleConstants = {
  appVersion: string;
  buildVersion: string;
};
const constants: MenuBarModuleConstants = NativeModules.MenuBarModule.getConstants();

const MenuBarModule: MenuBarModuleType = NativeModules.MenuBarModule;

const emitter = new NativeEventEmitter(MenuBarModule);

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
    throw error;
  } finally {
    listener.remove();
  }
}

export default {
  ...MenuBarModule,
  constants,
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
};
