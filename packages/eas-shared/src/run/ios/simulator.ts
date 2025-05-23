import * as osascript from '@expo/osascript';
import spawnAsync from '@expo/spawn-async';
import { IosSimulator } from 'common-types/build/devices';
import fs from 'fs-extra';
import path from 'path';

import * as CoreSimulator from './CoreSimulator';
import { EXPO_GO_BUNDLE_IDENTIFIER } from './constants';
import { simctlAsync } from './simctl';
import { xcrunAsync } from './xcrun';
import { downloadAppAsync } from '../../downloadAppAsync';
import Log from '../../log';
import UserSettings from '../../userSettings';
import { delayAsync } from '../../utils/delayAsync';
import { parseBinaryPlistAsync } from '../../utils/parseBinaryPlistAsync';
import { sleepAsync } from '../../utils/promise';
import * as Versions from '../../versions';

const INSTALL_WARNING_TIMEOUT = 60 * 1000;

export async function getFirstBootedIosSimulatorAsync(): Promise<IosSimulator | undefined> {
  const bootedSimulators = await getAvailableIosSimulatorsListAsync('booted');

  if (bootedSimulators.length > 0) {
    return bootedSimulators[0];
  }
  return undefined;
}

export async function getAvailableIosSimulatorsListAsync(query?: string): Promise<IosSimulator[]> {
  const { stdout } = query
    ? await simctlAsync(['list', 'devices', '--json', query])
    : await simctlAsync(['list', 'devices', '--json']);
  const info = parseSimControlJsonResults(stdout);

  const iosSimulators = [];

  for (const runtime of Object.keys(info.devices)) {
    // Given a string like 'com.apple.CoreSimulator.SimRuntime.tvOS-13-4'
    const runtimeSuffix = runtime.split('com.apple.CoreSimulator.SimRuntime.').pop();

    if (!runtimeSuffix) {
      continue;
    }

    // Create an array [tvOS, 13, 4]
    const [osType, ...osVersionComponents] = runtimeSuffix.split('-');

    if (osType === 'iOS' || osType === 'tvOS') {
      // Join the end components [13, 4] -> '13.4'
      const osVersion = osVersionComponents.join('.');
      const sims = info.devices[runtime];
      for (const device of sims) {
        if (device.isAvailable) {
          iosSimulators.push({
            ...device,
            runtime,
            osVersion,
            windowName: `${device.osType} ${device.name} (${osVersion})`,
            osType,
            state: device.state as 'Booted' | 'Shutdown',
            deviceType: 'simulator',
            lastBootedAt: device.lastBootedAt ? new Date(device.lastBootedAt).getTime() : undefined,
          });
        }
      }
    }
  }
  return iosSimulators;
}

export async function isSimulatorAsync(udid: string) {
  const availableIosSimulators = await getAvailableIosSimulatorsListAsync();
  return availableIosSimulators.some((sim) => sim.udid === udid);
}

function parseSimControlJsonResults(input: string): any {
  try {
    return JSON.parse(input);
  } catch (error: any) {
    // Nov 15, 2020: Observed this can happen when opening the simulator and the simulator prompts the user to update the xcode command line tools.
    // Unexpected token I in JSON at position 0
    if (error.message.includes('Unexpected token')) {
      Log.error(`Apple's simctl returned malformed JSON:\n${input}`);
    }
    throw error;
  }
}

export async function ensureSimulatorBootedAsync(simulator: IosSimulator): Promise<void> {
  if (simulator.state === 'Booted') {
    return;
  }

  await simctlAsync(['boot', simulator.udid]);
}

export async function openSimulatorAppAsync(simulatorUdid: string): Promise<void> {
  const args = ['-a', 'Simulator'];
  if (simulatorUdid) {
    // This has no effect if the app is already running.
    args.push('--args', '-CurrentDeviceUDID', simulatorUdid);
  }
  await spawnAsync('open', args);
}

export async function launchAppAsync(
  simulatorUdid: string,
  bundleIdentifier: string
): Promise<void> {
  Log.newLine();
  Log.log('Launching your app...');
  await activateSimulatorWindowAsync();
  await simctlAsync(['launch', simulatorUdid, bundleIdentifier]);

  Log.succeed('Successfully launched your app!');
}

// I think the app can be open while no simulators are booted.
async function waitForSimulatorAppToStartAsync(
  maxWaitTimeMs: number,
  intervalMs: number
): Promise<void> {
  Log.newLine();
  Log.log('Waiting for Simulator app to start...');

  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitTimeMs) {
    if (await isSimulatorAppRunningAsync()) {
      return;
    }
    await sleepAsync(Math.min(intervalMs, Math.max(maxWaitTimeMs - (Date.now() - startTime), 0)));
  }
  throw new Error('Timed out waiting for the iOS simulator to start.');
}

export async function activateSimulatorWindowAsync(): Promise<void> {
  try {
    await osascript.execAsync(`
    tell application "System Events"
      set assistiveAccess to UI elements enabled
    end tell

    if assistiveAccess then
      tell application "System Events" to tell process "Simulator"
        perform action "AXRaise" of window 0
      end tell
    else
      tell application "Simulator"
        activate
      end tell
    end if
  `);
  } catch (error: unknown) {
    // This can fail if the user hasn't enabled accessibility access.
    if (error instanceof Error) {
      console.warn(error.message);
    }
  }
}

async function isSimulatorAppRunningAsync(): Promise<boolean> {
  try {
    const result = await osascript.execAsync(
      'tell app "System Events" to count processes whose name is "Simulator"'
    );

    if (result.trim() === '0') {
      return false;
    }
  } catch (error: any) {
    if (error.message.includes('Application isn’t running')) {
      return false;
    }
    throw error;
  }

  return true;
}

export async function ensureSimulatorAppOpenedAsync(simulatorUuid: string): Promise<void> {
  if (await isSimulatorAppRunningAsync()) {
    return;
  }

  await openSimulatorAppAsync(simulatorUuid);
  await waitForSimulatorAppToStartAsync(60 * 1000, 1000);
}

export async function installAppAsync(deviceId: string, filePath: string): Promise<void> {
  Log.newLine();
  Log.log('Installing your app on the simulator...');

  await simctlAsync(['install', deviceId, filePath]);

  Log.succeed('Successfully installed your app on the simulator!');
}

export async function getSimulatorAppIdAsync(): Promise<string | undefined> {
  try {
    return (await osascript.execAsync('id of app "Simulator"')).trim();
  } catch {
    return undefined;
  }
}

export async function getAppBundleIdentifierAsync(appPath: string): Promise<string> {
  const { stdout, stderr } = await spawnAsync('xcrun', [
    'plutil',
    '-extract',
    'CFBundleIdentifier',
    'raw',
    path.join(appPath, 'Info.plist'),
  ]);

  if (!stdout) {
    throw new Error(
      `Could not read app bundle identifier from ${path.join(appPath, 'Info.plist')}: ${stderr}`
    );
  }

  return stdout.trim();
}

export async function openURLAsync(options: { udid: string; url: string }): Promise<void> {
  await activateSimulatorWindowAsync();
  console.log(`Opening url ${options.url}...`);
  await xcrunAsync(['simctl', 'openurl', options.udid, options.url]);
}

/**
 * Returns the local path for the installed tar.app. Returns null when the app isn't installed.
 *
 * @param props.udid device udid.
 * @param props.bundleIdentifier bundle identifier for app
 * @returns local file path to installed app binary, e.g. '/Users/evanbacon/Library/Developer/CoreSimulator/Devices/EFEEA6EF-E3F5-4EDE-9B72-29EAFA7514AE/data/Containers/Bundle/Application/FA43A0C6-C2AD-442D-B8B1-EAF3E88CF3BF/Exponent-2.21.3.tar.app'
 */
export async function getContainerPathAsync({
  udid,
  bundleIdentifier,
}: {
  udid: string;
  bundleIdentifier: string;
}): Promise<string | null> {
  if (CoreSimulator.isEnabled()) {
    return CoreSimulator.getContainerPathAsync({ udid, bundleIdentifier });
  }
  try {
    const { stdout } = await xcrunAsync(['simctl', 'get_app_container', udid, bundleIdentifier]);
    return stdout.trim();
  } catch (error: any) {
    if (error.message?.match(/No such file or directory/)) {
      return null;
    }
    throw error;
  }
}

export async function installAsync(options: { udid: string; dir: string }): Promise<any> {
  return simctlAsync(['install', options.udid, options.dir]);
}

export async function checkIfAppIsInstalled({
  udid,
  bundleId,
}: {
  udid: string;
  bundleId: string;
}): Promise<boolean> {
  return !!(await getContainerPathAsync({
    udid,
    bundleIdentifier: bundleId,
  }));
}

export async function isExpoClientInstalledOnSimulatorAsync(udid: string): Promise<boolean> {
  return checkIfAppIsInstalled({ udid, bundleId: EXPO_GO_BUNDLE_IDENTIFIER });
}

async function getClientForSDK(sdkVersionString?: string) {
  if (!sdkVersionString) {
    return null;
  }

  const sdkVersion = (await Versions.sdkVersionsAsync())[sdkVersionString];
  if (!sdkVersion) {
    return null;
  }

  return {
    url: sdkVersion.iosClientUrl,
    version: sdkVersion.iosClientVersion,
  };
}

export async function checkIfAppSupportsLaunchingUpdate({
  udid,
  bundleIdentifier,
  runtimeVersion,
}: {
  udid: string;
  bundleIdentifier: string;
  runtimeVersion: string;
}): Promise<boolean> {
  try {
    const localPath = await getContainerPathAsync({
      udid,
      bundleIdentifier,
    });
    if (!localPath) {
      return false;
    }

    const devLauncherPath = path.join(localPath, 'EXDevLauncher.bundle');
    if (!(await fs.pathExists(devLauncherPath))) {
      return false;
    }

    const expoInfoPlistPath = path.join(localPath, 'Expo.plist');
    const { EXUpdatesRuntimeVersion }: { EXUpdatesRuntimeVersion: string } =
      await parseBinaryPlistAsync(expoInfoPlistPath);

    return EXUpdatesRuntimeVersion === runtimeVersion;
  } catch {
    return false;
  }
}

export async function expoSDKSupportedVersionsOnSimulatorAsync(
  udid: string
): Promise<string[] | null> {
  try {
    const localPath = await getContainerPathAsync({
      udid,
      bundleIdentifier: EXPO_GO_BUNDLE_IDENTIFIER,
    });
    if (!localPath) {
      return null;
    }

    const builtInfoPlistPath = path.join(localPath, 'EXSDKVersions.plist');
    const { sdkVersions }: { sdkVersions: string[] } =
      await parseBinaryPlistAsync(builtInfoPlistPath);

    return sdkVersions;
  } catch {
    return null;
  }
}

function simulatorCacheDirectory() {
  const dotExpoHomeDirectory = UserSettings.dotExpoHomeDirectory();
  const dir = path.join(dotExpoHomeDirectory, 'ios-simulator-app-cache');
  fs.mkdirpSync(dir);
  return dir;
}

// If specific URL given just always download it and don't use cache
export async function _downloadSimulatorAppAsync(
  url?: string,
  downloadProgressCallback?: (roundedProgress: number) => void
) {
  if (!url) {
    const versions = await Versions.versionsAsync();
    url = versions.iosUrl;
  }

  const filename = path.parse(url).name;
  const dir = path.join(simulatorCacheDirectory(), `${filename}.app`);

  if (await fs.pathExists(dir)) {
    const filesInDir = await fs.readdir(dir);
    if (filesInDir.length > 0) {
      return dir;
    } else {
      fs.removeSync(dir);
    }
  }

  fs.mkdirpSync(dir);
  try {
    await downloadAppAsync(url, dir, { extract: true }, downloadProgressCallback);
  } catch (e: any) {
    fs.removeSync(dir);
    throw e;
  }

  return dir;
}

// url: Optional URL of Exponent.app tarball to download
export async function installExpoOnSimulatorAsync({
  url,
  udid,
  version,
}: {
  udid: string;
  url?: string;
  version?: string;
}) {
  let warningTimer: NodeJS.Timeout;
  const setWarningTimer = () => {
    if (warningTimer) {
      clearTimeout(warningTimer);
    }
    return setTimeout(() => {
      console.log(
        'This download is taking longer than expected. You can also try downloading the clients from the website at https://expo.dev/tools'
      );
    }, INSTALL_WARNING_TIMEOUT);
  };

  console.log('Downloading the Expo Go app');
  warningTimer = setWarningTimer();

  const dir = await _downloadSimulatorAppAsync(url, (progress) => {
    console.log(`Downloading: ${progress.toFixed(2)}%`);
  });

  console.log(
    version ? `Installing Expo Go ${version} on ${udid}` : `Installing Expo Go on ${udid}`
  );
  warningTimer = setWarningTimer();

  const result = await installAsync({ udid, dir });

  clearTimeout(warningTimer);
  return result;
}

export async function doesExpoClientNeedUpdatedAsync(
  udid: string,
  sdkVersion?: string
): Promise<boolean> {
  const supportedSDKs = await expoSDKSupportedVersionsOnSimulatorAsync(udid);
  if (!sdkVersion || !supportedSDKs) {
    return false;
  }

  return !supportedSDKs?.includes(sdkVersion);
}

export async function waitForExpoClientInstalledOnSimulatorAsync(udid: string): Promise<boolean> {
  if (await isExpoClientInstalledOnSimulatorAsync(udid)) {
    return true;
  } else {
    await delayAsync(100);
    return await waitForExpoClientInstalledOnSimulatorAsync(udid);
  }
}

export async function ensureExpoClientInstalledAsync(udid: string, sdkVersion?: string) {
  let isInstalled = await isExpoClientInstalledOnSimulatorAsync(udid);
  if (isInstalled && (await doesExpoClientNeedUpdatedAsync(udid, sdkVersion))) {
    isInstalled = false;
  }

  if (!isInstalled) {
    const iosClient = await getClientForSDK(sdkVersion);
    await installExpoOnSimulatorAsync({ udid, ...iosClient });
    await waitForExpoClientInstalledOnSimulatorAsync(udid);
  }
}
