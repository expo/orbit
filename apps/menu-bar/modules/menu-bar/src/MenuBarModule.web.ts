import { requireElectronModule } from 'react-native-electron-modules';

import { NativeMenuBarModule } from './types';

export default requireElectronModule<NativeMenuBarModule>('MenuBar');
