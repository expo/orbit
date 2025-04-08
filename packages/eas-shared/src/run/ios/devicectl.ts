/**
 * Copyright © 2024 650 Industries.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { getExpoHomeDirectory } from '@expo/config/build/getUserState';
import JsonFile from '@expo/json-file';
import spawnAsync, { SpawnOptions, SpawnResult } from '@expo/spawn-async';
import { execSync } from 'child_process';
import fs from 'fs';
import assert from 'node:assert';
import path from 'path';
import tempy from 'tempy';
import Debug from 'debug';

import { xcrunAsync } from './xcrun';
import Log from '../../log';
import { CommandError } from '../../utils/errors';

const DEVICE_CTL_EXISTS_PATH = path.join(getExpoHomeDirectory(), 'devicectl-exists');

const debug = Debug('expo:devicectl') as typeof console.log;

// eslint-disable-next-line @typescript-eslint/ban-types
type AnyEnum<T extends string = string> = T | (string & {});

type DeviceCtlDevice = {
  capabilities: DeviceCtlDeviceCapability[];
  connectionProperties: DeviceCtlConnectionProperties;
  deviceProperties: DeviceCtlDeviceProperties;
  hardwareProperties: DeviceCtlHardwareProperties;
  /** "A1A1AAA1-0011-1AA1-11A1-10A1111AA11A" */
  identifier: string;
  visibilityClass: AnyEnum<'default'>;
};

type DeviceCtlHardwareProperties = {
  cpuType: DeviceCtlCpuType;
  deviceType: AnyEnum<'iPhone'>;
  /** 1114404411111111 */
  ecid: number;
  /** "D74AP" */
  hardwareModel: string;
  /** 512000000000 */
  internalStorageCapacity: number;
  /** true */
  isProductionFused: boolean;
  /** "iPhone 14 Pro Max" */
  marketingName: string;
  /** "iOS" */
  platform: AnyEnum<'iOS'>;
  /** "iPhone15,3" */
  productType: AnyEnum<'iPhone13,4' | 'iPhone15,3'>;
  reality: AnyEnum<'physical'>;
  /** "X2X1CC1XXX" */
  serialNumber: string;
  supportedCPUTypes: DeviceCtlCpuType[];
  /** [1] */
  supportedDeviceFamilies: number[];
  thinningProductType: AnyEnum<'iPhone15,3'>;
  /** "00001110-001111110110101A" */
  udid: string;
};

type DeviceCtlDeviceProperties = {
  /** true */
  bootedFromSnapshot: boolean;
  /** "com.apple.os.update-AD0CF111ACFF11A11111A76A3D1262AE42A3F56F305AF5AE1135393A7A14A7D1" */
  bootedSnapshotName: string;
  /** false */
  ddiServicesAvailable: boolean;

  developerModeStatus: 'enabled' | 'disabled';
  /** false */
  hasInternalOSBuild: boolean;
  /** "Evan's phone" */
  name: string;
  /** "21E236" */
  osBuildUpdate: string;
  /** "17.4.1" */
  osVersionNumber: string;
  /** false */
  rootFileSystemIsWritable: boolean;
};

type DeviceCtlDeviceCapability =
  | {
      name: AnyEnum;
      featureIdentifier: AnyEnum;
    }
  | {
      featureIdentifier: 'com.apple.coredevice.feature.connectdevice';
      name: 'Connect to Device';
    }
  | {
      featureIdentifier: 'com.apple.coredevice.feature.unpairdevice';
      name: 'Unpair Device';
    }
  | {
      featureIdentifier: 'com.apple.coredevice.feature.acquireusageassertion';
      name: 'Acquire Usage Assertion';
    };

type DeviceCtlConnectionProperties = {
  authenticationType: AnyEnum<'manualPairing'>;
  isMobileDeviceOnly: boolean;
  /** "2024-04-20T22:50:04.244Z" */
  lastConnectionDate: string;
  pairingState: AnyEnum<'paired'>;
  /** ["00001111-001111110110101A.coredevice.local", "A1A1AAA1-0011-1AA1-11A1-10A1111AA11A.coredevice.local"] */
  potentialHostnames: string[];
  transportType: AnyEnum<'localNetwork' | 'wired'>;
  tunnelState: AnyEnum<'disconnected'>;
  tunnelTransportProtocol: AnyEnum<'tcp'>;
};

type DeviceCtlCpuType = {
  name: AnyEnum<'arm64e' | 'arm64' | 'arm64_32'>;
  subType: number;
  /** 16777228 */
  type: number;
};

/** Run a `devicectl` command. */
export async function devicectlAsync(args: string[], options?: SpawnOptions): Promise<SpawnResult> {
  try {
    return await xcrunAsync(['devicectl', ...args], options);
  } catch (error: any) {
    if (error instanceof CommandError) {
      throw error;
    }
    if ('stderr' in error) {
      const errorCodes = getDeviceCtlErrorCodes(error.stderr);
      if (errorCodes.includes('Locked')) {
        throw new CommandError('APPLE_DEVICE_LOCKED', 'Device is locked, unlock and try again.');
      }
    }
    throw error;
  }
}

export async function getConnectedAppleDevicesAsync() {
  if (!hasDevicectlEverBeenInstalled()) {
    debug('devicectl not found, skipping remote Apple devices.');
    return [];
  }

  const tmpPath = tempy.file();
  const devices = await devicectlAsync([
    'list',
    'devices',
    '--json-output',
    tmpPath,
    // Give two seconds before timing out: between 5 and 9223372036854775807
    '--timeout',
    '5',
  ]);
  debug(devices.stdout);
  const devicesJson = await JsonFile.readAsync(tmpPath);

  if ((devicesJson as any)?.info?.jsonVersion !== 2) {
    Log.warn(
      'Unexpected devicectl JSON version output from devicectl. Connecting to physical Apple devices may not work as expected.'
    );
  }

  assertDevicesJson(devicesJson);

  return devicesJson.result.devices as DeviceCtlDevice[];
}

function assertDevicesJson(
  results: any
): asserts results is { result: { devices: DeviceCtlDevice[] } } {
  assert(
    results != null && 'result' in results && Array.isArray(results?.result?.devices),
    'Malformed JSON output from devicectl: ' + JSON.stringify(results, null, 2)
  );
}

export async function launchBinaryOnMacAsync(
  bundleId: string,
  appBinaryPath: string
): Promise<void> {
  const args = ['-b', bundleId, appBinaryPath];
  try {
    await spawnAsync('open', args);
  } catch (error: any) {
    if ('code' in error) {
      if (error.code === 1) {
        throw new CommandError(
          'MACOS_LAUNCH',
          'Failed to launch the compatible binary on macOS: open ' +
            args.join(' ') +
            '\n\n' +
            error.message
        );
      }
    }
    throw error;
  }
}

export async function launchAppWithDeviceCtl(deviceId: string, bundleId: string) {
  await devicectlAsync(['device', 'process', 'launch', '--device', deviceId, bundleId]);
}

/** Find all error codes from the output log */
function getDeviceCtlErrorCodes(log: string): string[] {
  return [...log.matchAll(/BSErrorCodeDescription\s+=\s+(.*)$/gim)].map(([_line, code]) => code);
}

let hasEverBeenInstalled: boolean | undefined;

export function hasDevicectlEverBeenInstalled() {
  if (hasEverBeenInstalled) return hasEverBeenInstalled;
  // It doesn't appear possible for devicectl to ever be uninstalled. We can just check once and store this result forever
  // to prevent cold boots of devicectl from slowing down all invocations of `expo run ios`
  if (fs.existsSync(DEVICE_CTL_EXISTS_PATH)) {
    hasEverBeenInstalled = true;
    return true;
  }

  const isInstalled = isDevicectlInstalled();

  if (isInstalled) {
    fs.writeFileSync(DEVICE_CTL_EXISTS_PATH, '1');
  }
  hasEverBeenInstalled = isInstalled;
  return isInstalled;
}

function isDevicectlInstalled() {
  try {
    execSync('xcrun devicectl --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wraps the apple device method for installing and running an app
 */
export async function installAndLaunchAppAsync(props: {
  bundle: string;
  bundleIdentifier: string;
  udid: string;
}): Promise<void> {
  const { bundle, bundleIdentifier, udid } = props;

  await installAppWithDeviceCtlAsync(udid, bundle);

  async function launchAppOptionally() {
    try {
      await launchAppWithDeviceCtl(udid, bundleIdentifier);
    } catch (error: any) {
      if (error.code === 'APPLE_DEVICE_LOCKED') {
        // Get the app name from the binary path.
        const appName = path.basename(bundle).split('.')[0] ?? 'app';
        throw new CommandError(`Cannot launch ${appName} because the device is locked.`);
      }
      if (error.message.includes('BSErrorCodeDescription = fairplay')) {
        throw new CommandError(
          `Unable to launch app due to a FairPlay failure. Ensure this device is included in your provisioning profile`
        );
      }

      throw error;
    }
  }

  await launchAppOptionally();
}

async function installAppWithDeviceCtlAsync(
  uuid: string,
  bundleIdOrAppPath: string
): Promise<void> {
  await xcrunAsync(['devicectl', 'device', 'install', 'app', '--device', uuid, bundleIdOrAppPath]);
}
