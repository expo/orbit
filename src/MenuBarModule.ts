import {NativeModules} from 'react-native';

type MenuBarModule = {
  exitApp(): void;
  runCommand: (command: string, args: string[]) => Promise<string>;
};

export default NativeModules.MenuBarModule as MenuBarModule;
