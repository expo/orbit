import { Registry } from 'react-native-electron-modules';

import DeviceEventEmitter from './DeviceEventEmitter/preload';
import Linking from './Linking/preload';
import FileHandlerModule from '../../modules/file-handler/electron/preload';
import MenuBarModule from '../../modules/menu-bar/electron/preload';
import RudderModule from '../../modules/rudder/electron/preload';

export const PreloadModules: Registry = [
  MenuBarModule,
  DeviceEventEmitter,
  Linking,
  RudderModule,
  FileHandlerModule,
];
