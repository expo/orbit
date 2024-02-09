import { Registry } from 'react-native-electron-modules';

import AutoResizerRootViewManager from './AutoResizerRootViewManager/main';
import Linking from './Linking/main';
import WindowManager from './WindowManager/main';
import FilePickerModule from '../../modules/file-picker/electron/main';
import MenuBarModule from '../../modules/menu-bar/electron/main';
import RudderModule from '../../modules/rudder/electron/main';

export const MainModules: Registry = [
  MenuBarModule,
  Linking,
  AutoResizerRootViewManager,
  WindowManager,
  RudderModule,
  FilePickerModule,
];
