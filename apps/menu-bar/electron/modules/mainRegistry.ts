import { Registry } from 'react-native-electron-modules';

import MenuBarModule from '../../modules/menu-bar/electron/main';
import Linking from './Linking/main';

export const MainModules: Registry = [MenuBarModule, Linking];
