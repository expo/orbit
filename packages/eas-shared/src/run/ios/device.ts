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
import { launchAppWithDeviceCtl } from './devicectl';
import { installOnMacOSAsync, launchOnMacOSAsync } from './macOS';

/**
 * Launch an app already installed on a physical device (iOS 17+ devicectl),
 * optionally handing it a URL — a deep link the app handles. System apps work
 * too: `com.apple.Preferences` + `prefs:root=General&path=ManagedConfigurationList`
 * opens Settings → General → VPN & Device Management (verified on iOS 27; the
 * `App-prefs:` variants land on the Apps list since iOS 18).
 */
async function launchAppAsync(options: { udid: string; bundleId: string; url?: string }) {
  const { udid, bundleId, url } = options;
  if (url) {
    await openURLAsync({ udid, bundleId, url });
  } else {
    await launchAppWithDeviceCtl(udid, bundleId);
  }
}

const AppleDevice = {
  getConnectedDevicesAsync,
  getAppDeltaDirectory,
  installOnDeviceAsync,
  launchAppAsync,
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
