import { Linking as NativeLinking } from 'react-native';
import { requireElectronModule } from 'react-native-electron-modules/build/requireElectronModule';

export const Linking = requireElectronModule<NativeLinking>('Linking');
