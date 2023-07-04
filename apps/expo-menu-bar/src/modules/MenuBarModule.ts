import {NativeEventEmitter, NativeModule, NativeModules} from 'react-native';

type MenuBarModule = NativeModule & {
  exitApp(): void;
  runCli: (
    command: string,
    args: string[],
    listenerId: number,
  ) => Promise<string>;
  runCommand: (command: string, args: string[]) => Promise<void>;
  setPopoverSize: (width: number, height: number) => Promise<void>;
};

const MenuBarModule: MenuBarModule = NativeModules.MenuBarModule;

const emitter = new NativeEventEmitter(MenuBarModule);

let listenerCounter = 0;
async function runCli(
  command: string,
  args: string[],
  callback?: (status: string) => void,
) {
  const id = listenerCounter++;
  const filteredCallback = (event: {listenerId: number; output: string}) => {
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
  exitApp: () => MenuBarModule.exitApp(),
  runCli,
  runGenericCommand: async (
    command: string,
    args: string[],
    callback: (status: string) => void,
  ) => {
    const listener = emitter.addListener('onNewCommandLine', callback);
    await MenuBarModule.runCommand(command, args);
    listener.remove();
  },
};
