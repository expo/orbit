import { requireElectronModule } from 'react-native-electron-modules/build/requireElectronModule';

import { NativeMenuBarModule } from './types';

export default requireElectronModule<NativeMenuBarModule>('MenuBar');
