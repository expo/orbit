import { AppleDevice, extractAppFromLocalArchiveAsync } from 'eas-shared';

type LaunchAppOptions = {
  deviceId: string;
  /** Bundle identifier of an installed app, or any system app (e.g. com.apple.Preferences). */
  bundleId?: string;
  /** Alternatively, the local .app / .ipa the app was installed from — its bundle id is read. */
  appPath?: string;
  /** URL handed to the app on launch; with a system app this selects a screen. */
  url?: string;
};

/**
 * Launch an app that is already on a physical iOS device — no reinstall — and
 * optionally hand it a URL (a deep link the app handles). Works for system apps
 * too, which is how Orbit opens a Settings screen:
 *   --bundle-id com.apple.Preferences --url "prefs:root=General&path=ManagedConfigurationList"
 * is Settings → General → VPN & Device Management (verified on iOS 27). Use the
 * `prefs:` scheme: since iOS 18 the `App-prefs:` variants land on the Apps list.
 */
export async function launchAppAsync(options: LaunchAppOptions) {
  let bundleId = options.bundleId;
  if (!bundleId) {
    if (!options.appPath) {
      throw new Error('Pass --bundle-id or --app-path');
    }
    const appPath = options.appPath.endsWith('.app')
      ? options.appPath
      : await extractAppFromLocalArchiveAsync(options.appPath);
    bundleId = await AppleDevice.getBundleIdentifierForBinaryAsync(appPath);
  }
  await AppleDevice.launchAppAsync({ udid: options.deviceId, bundleId, url: options.url });
  return { bundleId };
}
