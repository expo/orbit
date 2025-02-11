import {
  getConnectedDevicesAsync,
  getBundleIdentifierForBinaryAsync,
  openURLAsync,
  openExpoGoURLAsync,
  ensureExpoClientInstalledAsync,
  checkIfAppIsInstalled,
} from './appleDevice/AppleDevice';
import { getAppDeltaDirectory, installOnDeviceAsync } from './appleDevice/installOnDeviceAsync';

const AppleDevice = {
  getConnectedDevicesAsync,
  getAppDeltaDirectory,
  installOnDeviceAsync,
  getBundleIdentifierForBinaryAsync,
  openURLAsync,
  openExpoGoURLAsync,
  ensureExpoClientInstalledAsync,
  checkIfAppIsInstalled,
};

export default AppleDevice;
