import {
  getConnectedDevicesAsync,
  getBundleIdentifierForBinaryAsync,
  openURLAsync,
  openExpoGoURLAsync,
  ensureExpoClientInstalledAsync,
  checkIfAppIsInstalled,
} from './appleDevice/AppleDevice';
import { getAppDeltaDirectory, installOnDeviceAsync } from './appleDevice/installOnDeviceAsync';
import { installOnMacOSAsync, launchOnMacOSAsync } from './macOS';

const AppleDevice = {
  getConnectedDevicesAsync,
  getAppDeltaDirectory,
  installOnDeviceAsync,
  getBundleIdentifierForBinaryAsync,
  openURLAsync,
  openExpoGoURLAsync,
  ensureExpoClientInstalledAsync,
  checkIfAppIsInstalled,
  installOnMacOSAsync,
  launchOnMacOSAsync,
};

export default AppleDevice;
