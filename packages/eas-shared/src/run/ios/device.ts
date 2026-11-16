import { InternalError } from 'common-types';

import {
  getConnectedDevicesAsync,
  getBundleIdentifierForBinaryAsync,
  openURLAsync as openURLWithDevicectlAsync,
  ensureExpoClientInstalledAsync as ensureExpoClientInstalledOverUsbmuxAsync,
  checkIfAppIsInstalled,
  listFreeProfileAppsAsync,
  uninstallAppAsync as uninstallAppOverUsbmuxAsync,
} from './appleDevice/AppleDevice';
import { getAppDeltaDirectory, installOnDeviceAsync } from './appleDevice/installOnDeviceAsync';
import {
  getUsbmuxdHelperGuidance,
  isAppleUsbDeviceConnectedAsync,
  isUsbmuxdAvailableAsync,
} from './appleDevice/usbmuxd';
import {
  APP_STORE_BUNDLE_IDENTIFIER,
  EXPO_GO_APP_STORE_URL,
  EXPO_GO_BUNDLE_IDENTIFIER,
} from './constants';
import {
  hasDevicectlEverBeenInstalled,
  launchAppWithDeviceCtl,
  uninstallAppWithDeviceCtl,
} from './devicectl';
import { installOnMacOSAsync, launchOnMacOSAsync } from './macOS';
import * as WirelessAppleDevice from './remotePairing/WirelessAppleDevice';

/**
 * Launch an app already installed on a physical device (iOS 17+ devicectl),
 * optionally handing it a URL — a deep link the app handles. System apps work
 * too: `com.apple.Preferences` + `prefs:root=General&path=ManagedConfigurationList`
 * opens Settings → General → VPN & Device Management (verified on iOS 27; the
 * `App-prefs:` variants land on the Apps list since iOS 18).
 */
async function launchAppAsync(options: { udid: string; bundleId: string; url?: string }) {
  const { udid, bundleId, url } = options;
  if (await launchOverWifiAsync(options)) return;
  if (url) {
    await openURLAsync({ udid, bundleId, url });
  } else {
    await launchAppWithDeviceCtl(udid, bundleId);
  }
}

/**
 * Remove an app from a physical device: over Wi-Fi when paired that way, then usbmux
 * (every platform), falling back to devicectl when usbmux cannot reach the device.
 * Frees one of the three slots a free Apple ID gets.
 */
async function uninstallAppAsync(options: { udid: string; bundleId: string }) {
  let wifiError: unknown;
  if (WirelessAppleDevice.hasWirelessPairing(options.udid)) {
    try {
      return await WirelessAppleDevice.uninstallAppAsync(options);
    } catch (error) {
      wifiError = error;
    }
  }
  try {
    await uninstallAppOverUsbmuxAsync(options);
  } catch (error: any) {
    // The phone is only reachable over Wi-Fi: its error is the one worth reporting.
    if (wifiError && /^APPLE_DEVICE_USBMUXD/.test(error?.code ?? '')) throw wifiError;
    if (error?.code === 'APPLE_DEVICE_USBMUXD' && hasDevicectlEverBeenInstalled()) {
      return await uninstallAppWithDeviceCtl(options.udid, options.bundleId);
    }
    throw error;
  }
}

/**
 * Launch through the RemotePairing tunnel when the iPhone was paired over Wi-Fi. Resolves
 * false when it wasn't, or (on macOS) when the tunnel failed and devicectl can try instead.
 */
async function launchOverWifiAsync(options: { udid: string; bundleId: string; url?: string }) {
  if (!WirelessAppleDevice.hasWirelessPairing(options.udid)) return false;
  try {
    await WirelessAppleDevice.launchAppAsync(options);
    return true;
  } catch (error) {
    if (process.platform !== 'darwin' || !hasDevicectlEverBeenInstalled()) throw error;
    return false;
  }
}

async function openURLAsync(options: { udid: string; url: string; bundleId: string }) {
  if (await launchOverWifiAsync(options)) return;
  await openURLWithDevicectlAsync(options);
}

async function openExpoGoURLAsync(udid: string, url: string) {
  await openURLAsync({ udid, url, bundleId: EXPO_GO_BUNDLE_IDENTIFIER });
}

async function ensureExpoClientInstalledAsync(udid: string) {
  if (!WirelessAppleDevice.hasWirelessPairing(udid)) {
    return await ensureExpoClientInstalledOverUsbmuxAsync(udid);
  }
  if (!(await WirelessAppleDevice.isAppInstalledAsync(udid, EXPO_GO_BUNDLE_IDENTIFIER))) {
    await openURLAsync({ udid, bundleId: APP_STORE_BUNDLE_IDENTIFIER, url: EXPO_GO_APP_STORE_URL });
    throw new InternalError(
      'EXPO_GO_NOT_INSTALLED_ON_DEVICE',
      'Expo Go is not installed on device, please install it from the App Store and try again.'
    );
  }
}

const AppleDevice = {
  getConnectedDevicesAsync,
  getAppDeltaDirectory,
  installOnDeviceAsync,
  launchAppAsync,
  uninstallAppAsync,
  listFreeProfileAppsAsync,
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
  getConnectedWirelessDevicesAsync: WirelessAppleDevice.getConnectedWirelessDevicesAsync,
  pairWirelessDeviceAsync: WirelessAppleDevice.pairWirelessDeviceAsync,
  unpairWirelessDevice: WirelessAppleDevice.unpairWirelessDevice,
};

export default AppleDevice;
