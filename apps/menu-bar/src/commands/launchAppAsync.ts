import MenuBarModule from '../modules/MenuBarModule';

export const IOS_SETTINGS_BUNDLE_ID = 'com.apple.Preferences';
/**
 * Settings → General → VPN & Device Management, where a developer certificate
 * gets trusted. The `prefs:` scheme still deep-links there (verified on iOS 27.0
 * by reading the resulting screen); the `App-prefs:` variants all land on the
 * Apps list since iOS 18. Undocumented either way — if Apple drops it, Settings
 * opens on its root and the alert's written path still applies.
 */
export const IOS_DEVICE_MANAGEMENT_SETTINGS_URL =
  'prefs:root=General&path=ManagedConfigurationList';

type LaunchAppOptions = {
  deviceId: string;
  /** Bundle identifier of an installed app, or a system app such as Settings. */
  bundleId?: string;
  /** Alternatively, the .app / .ipa the app was installed from. */
  appPath?: string;
  /** URL handed to the app on launch; with a system app this selects a screen. */
  url?: string;
};

/** Launch an app already on a physical iOS device — no reinstall. */
export async function launchAppAsync({ deviceId, bundleId, appPath, url }: LaunchAppOptions) {
  const args = ['--device-id', deviceId];
  if (bundleId) args.push('--bundle-id', bundleId);
  if (appPath) args.push('--app-path', appPath);
  if (url) args.push('--url', url);
  await MenuBarModule.runCli('launch-app', args, undefined);
}

/** Open Settings → General → VPN & Device Management on the device. */
export function openDeviceManagementSettingsAsync(deviceId: string) {
  return launchAppAsync({
    deviceId,
    bundleId: IOS_SETTINGS_BUNDLE_ID,
    url: IOS_DEVICE_MANAGEMENT_SETTINGS_URL,
  });
}
