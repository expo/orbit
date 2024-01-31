import { DeviceEventEmitter as NativeDeviceEventEmitter } from 'react-native';
import { requireElectronModule } from 'react-native-electron-modules/build/requireElectronModule';

export const DeviceEventEmitter =
  requireElectronModule<typeof NativeDeviceEventEmitter>('DeviceEventEmitter');
