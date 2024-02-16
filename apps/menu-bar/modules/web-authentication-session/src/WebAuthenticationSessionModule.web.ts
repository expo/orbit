import { requireElectronModule } from 'react-native-electron-modules/build/requireElectronModule';

import { WebAuthenticationSessionModuleType } from './WebAuthenticationSession.types';

export default requireElectronModule<WebAuthenticationSessionModuleType>(
  'WebAuthenticationSession'
);
