import { requireElectronModule } from 'react-native-electron-modules/build/requireElectronModule';

import { WebAuthenticationSessionModuleType, WebBrowserResultType } from './types';

export default requireElectronModule<WebAuthenticationSessionModuleType>(
  'WebAuthenticationSession'
);

export { WebBrowserResultType };
