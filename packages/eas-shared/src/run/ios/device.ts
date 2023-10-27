import {
  getConnectedDevicesAsync,
  getBundleIdentifierForBinaryAsync,
  openSnackURLAsync,
  ensureExpoClientInstalledAsync,
} from './appleDevice/AppleDevice';
import { getAppDeltaDirectory, installOnDeviceAsync } from './appleDevice/installOnDeviceAsync';

const AppleDevice = {
  getConnectedDevicesAsync,
  getAppDeltaDirectory,
  installOnDeviceAsync,
  getBundleIdentifierForBinaryAsync,
  openSnackURLAsync,
  ensureExpoClientInstalledAsync,
};

export default AppleDevice;
