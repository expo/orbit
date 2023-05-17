import {NativeModules} from 'react-native';

type MenuBarModule = {
  exitApp(): void;
};

export default NativeModules.MenuBarModule as MenuBarModule;
