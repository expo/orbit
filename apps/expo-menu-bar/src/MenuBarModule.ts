import {NativeEventEmitter, NativeModule, NativeModules} from 'react-native';

type MenuBarModule = NativeModule & {
  exitApp(): void;
  runCommand: (command: string, args: string[]) => Promise<void>;
};

const MenuBarModule: MenuBarModule = NativeModules.MenuBarModule;

const emitter = new NativeEventEmitter(MenuBarModule);

export default {
  ...MenuBarModule,
  runCommand: async (
    command: string,
    args: string[],
    callback: (status: string) => void,
  ) => {
    const listener = emitter.addListener('onNewCommandLine', callback);
    await NativeModules.MenuBarModule.runCommand(command, args);
    listener.remove();
  },
};
