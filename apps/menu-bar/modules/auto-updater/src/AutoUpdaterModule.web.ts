import { requireElectronModule } from 'react-native-electron-modules/build/requireElectronModule';

import { AutoUpdaterType } from './AutoUpdater.types';

export default requireElectronModule<AutoUpdaterType>('AutoUpdater');
