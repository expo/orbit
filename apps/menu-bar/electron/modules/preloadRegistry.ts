import { Registry } from 'react-native-electron-modules';

import DeviceEventEmitter from './DeviceEventEmitter/preload';
import Linking from './Linking/preload';
import MenuBarModule from '../../modules/menu-bar/electron/preload';

export const PreloadModules: Registry = [MenuBarModule, DeviceEventEmitter, Linking];
