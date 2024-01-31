import { Registry } from 'react-native-electron-modules';

import Linking from './Linking/main';
import MenuBarModule from '../../modules/menu-bar/electron/main';

export const MainModules: Registry = [MenuBarModule, Linking];
