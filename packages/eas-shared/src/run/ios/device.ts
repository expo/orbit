import {
  getConnectedDevicesAsync,
  getBundleIdentifierForBinaryAsync,
  openURLAsync,
  openExpoGoURLAsync,
  ensureExpoClientInstalledAsync,
  checkIfAppIsInstalled,
} from './appleDevice/AppleDevice';
import { getAppDeltaDirectory, installOnDeviceAsync } from './appleDevice/installOnDeviceAsync';
import {
  getUsbmuxdHelperGuidance,
  isAppleUsbDeviceConnectedAsync,
  isUsbmuxdAvailableAsync,
} from './appleDevice/usbmuxd';
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
  isUsbmuxdAvailableAsync,
  getUsbmuxdHelperGuidance,
  isAppleUsbDeviceConnectedAsync,
};

export default AppleDevice;
