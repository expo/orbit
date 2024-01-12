import {
  getConnectedDevicesAsync,
  getBundleIdentifierForBinaryAsync,
  openSnackURLAsync,
  ensureExpoClientInstalledAsync,
  checkIfAppIsInstalled,
} from './appleDevice/AppleDevice';
import { getAppDeltaDirectory, installOnDeviceAsync } from './appleDevice/installOnDeviceAsync';

const AppleDevice = {
  getConnectedDevicesAsync,
  getAppDeltaDirectory,
  installOnDeviceAsync,
  getBundleIdentifierForBinaryAsync,
  openSnackURLAsync,
  ensureExpoClientInstalledAsync,
  checkIfAppIsInstalled,
};

export default AppleDevice;
