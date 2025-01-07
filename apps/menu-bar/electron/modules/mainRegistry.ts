import { Registry } from 'react-native-electron-modules';

import AlertModule from './Alert/main';
import AutoResizerRootViewManager from './AutoResizerRootViewManager/main';
import Linking from './Linking/main';
import WindowManager from './WindowManager/main';
import AutoUpdater from '../../modules/auto-updater/electron/main';
import FileHandler from '../../modules/file-handler/electron/main';
import FilePickerModule from '../../modules/file-picker/electron/main';
import MenuBarModule from '../../modules/menu-bar/electron/main';
import RudderModule from '../../modules/rudder/electron/main';
import WebAuthenticationSession from '../../modules/web-authentication-session/electron/main';

export const MainModules: Registry = [
  MenuBarModule,
  Linking,
  AutoResizerRootViewManager,
  WindowManager,
  RudderModule,
  FilePickerModule,
  AlertModule,
  WebAuthenticationSession,
  AutoUpdater,
  FileHandler,
];
