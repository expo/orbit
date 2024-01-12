import {
  getConnectedDevicesAsync,
  getBundleIdentifierForBinaryAsync,
  openURLAsync,
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
  openURLAsync,
  openSnackURLAsync,
  ensureExpoClientInstalledAsync,
  checkIfAppIsInstalled,
};

export default AppleDevice;
