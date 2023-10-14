import {
  getConnectedDevicesAsync,
  getBundleIdentifierForBinaryAsync,
} from './appleDevice/AppleDevice';
import { getAppDeltaDirectory, installOnDeviceAsync } from './appleDevice/installOnDeviceAsync';

const AppleDevice = {
  getConnectedDevicesAsync,
  getAppDeltaDirectory,
  installOnDeviceAsync,
  getBundleIdentifierForBinaryAsync,
};

export default AppleDevice;
