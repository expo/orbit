import { requireElectronModule } from 'react-native-electron-modules/build/requireElectronModule';

import { NativeFilePickerModule } from './types';

export default requireElectronModule<NativeFilePickerModule>('FilePicker');
