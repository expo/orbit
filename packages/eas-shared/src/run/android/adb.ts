import spawnAsync, { SpawnResult } from '@expo/spawn-async';
import { AndroidConnectedDevice, AndroidEmulator } from 'common-types/build/devices';
import os from 'os';
import path from 'path';

import { getAndroidSdkRootAsync } from './sdk';
import Log from '../../log';
import { sleepAsync } from '../../utils/promise';

const BEGINNING_OF_ADB_ERROR_MESSAGE = 'error: ';

export async function adbAsync(...args: string[]): Promise<SpawnResult> {
  const adbExecutable = await getAdbExecutableAsync();
  try {
    return await spawnAsync(adbExecutable, args);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `adb command not found, please install it globally or configure the ANDROID_HOME environment variable`
      );
    }

    let errorMessage = (error.stderr || error.stdout || error.message).trim();
    if (errorMessage.startsWith(BEGINNING_OF_ADB_ERROR_MESSAGE)) {
      errorMessage = errorMessage.substring(BEGINNING_OF_ADB_ERROR_MESSAGE.length);
    }
    error.message = errorMessage;
    throw error;
  }
}

export async function getAdbExecutableAsync(): Promise<string> {
  const sdkRoot = await getAndroidSdkRootAsync();
  if (!sdkRoot) {
    Log.debug('Failed to resolve the Android SDK path, falling back to global adb executable');
    return 'adb';
  }

  return path.join(sdkRoot, 'platform-tools/adb');
}

export function sanitizeAdbDeviceName(deviceName: string): string | undefined {
  return deviceName.trim().split(/[\r\n]+/)[0];
}

/**
 * Pair a physical Android device over Wi-Fi using the pairing code shown under
 * the device's "Wireless debugging > Pair device with pairing code" screen.
 *
 * @param pairingAddress the `ipAddress:port` shown on the pairing dialog (this
 * port differs from the one used to connect to the device afterwards)
 * @param pairingCode the six digit code shown on the pairing dialog
 */
export async function pairAndroidDeviceAsync({
  pairingAddress,
  pairingCode,
}: {
  pairingAddress: string;
  pairingCode: string;
}): Promise<void> {
  const { stdout } = await adbAsync('pair', pairingAddress, pairingCode);
  // A successful pairing prints `Successfully paired to <address> [guid=...]`.
  if (!/successfully paired/i.test(stdout)) {
    throw new Error(sanitizeAdbDeviceName(stdout) ?? `Failed to pair with ${pairingAddress}.`);
  }
}

/**
 * Connect to a physical Android device over Wi-Fi. The device must have been
 * paired beforehand (see {@link pairAndroidDeviceAsync}).
 *
 * @param address the `ipAddress:port` shown on the "Wireless debugging" screen
 */
export async function connectAndroidDeviceAsync(address: string): Promise<void> {
  const { stdout } = await adbAsync('connect', address);
  // adb prints `connected to <address>` or `already connected to <address>` on
  // success and `failed to connect to <address>` (or `cannot connect ...`) on failure.
  if (!/connected to/i.test(stdout) || /failed|cannot|unable/i.test(stdout)) {
    throw new Error(sanitizeAdbDeviceName(stdout) ?? `Failed to connect to ${address}.`);
  }
}

export type AdbMdnsService = {
  /** Service instance name, e.g. `adb-RZ8RA1057HK-QnTpKE` or the name embedded in a pairing QR code */
  name: string;
  /** e.g. `_adb-tls-pairing._tcp` */
  serviceType: string;
  /** `ipAddress:port` */
  address: string;
};

const ADB_MDNS_SERVICE_TYPES = {
  pairing: '_adb-tls-pairing',
  connect: '_adb-tls-connect',
};

/**
 * List the wireless debugging services advertised by Android devices on the
 * local network, using adb's built-in mDNS discovery.
 */
export async function getAdbMdnsServicesAsync(): Promise<AdbMdnsService[]> {
  const { stdout } = await adbAsync('mdns', 'services');

  return (
    stdout
      .trim()
      .split(/[\r\n]+/)
      // First line is `List of discovered mdns services`
      .filter((line) => line.includes('_adb'))
      .map((line) => {
        const [name, serviceType, address] = line.split(/\s+/).filter(Boolean);
        return { name, serviceType, address };
      })
      .filter(({ name, serviceType, address }) => name && serviceType && address)
  );
}

/**
 * Wait until a wireless debugging service matching the given filters is
 * advertised on the local network. When pairing with a QR code, the device
 * advertises a `pairing` service named after the QR code contents once the
 * code is scanned.
 *
 * @returns the matching service, or `null` if none was found within `timeoutMs`
 */
export async function waitForAdbMdnsServiceAsync({
  serviceType,
  serviceName,
  ipAddress,
  timeoutMs,
  intervalMs = 1000,
}: {
  serviceType: keyof typeof ADB_MDNS_SERVICE_TYPES;
  serviceName?: string;
  ipAddress?: string;
  timeoutMs: number;
  intervalMs?: number;
}): Promise<AdbMdnsService | null> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const services = await getAdbMdnsServicesAsync();
    const match = services.find(
      (service) =>
        service.serviceType.startsWith(ADB_MDNS_SERVICE_TYPES[serviceType]) &&
        (!serviceName || service.name === serviceName) &&
        (!ipAddress || service.address.split(':')[0] === ipAddress)
    );
    if (match) {
      return match;
    }
    await sleepAsync(intervalMs);
  }

  return null;
}

/**
 * Return the Emulator name for an emulator ID, this can be used to determine if an emulator is booted.
 *
 * @param devicePid a value like `emulator-5554` from `abd devices`
 */
export async function getAdbNameForEmulatorIdAsync(emulatorPid: string): Promise<string | null> {
  const { stdout } = await adbAsync('-s', emulatorPid, 'emu', 'avd', 'name');

  if (stdout.match(/could not connect to TCP port .*: Connection refused/)) {
    // Can also occur when the emulator does not exist.
    throw new Error(`Emulator not found: ${stdout}`);
  }

  return sanitizeAdbDeviceName(stdout) ?? null;
}

// TODO: This is very expensive for some operations.
export async function getRunningDevicesAsync(): Promise<
  (AndroidConnectedDevice | AndroidEmulator)[]
> {
  const { stdout } = await adbAsync('devices', '-l');

  const splitItems = stdout.trim().split(os.EOL);

  const attachedDevices = splitItems
    // First line is `"List of devices attached"`, remove it
    .slice(1, splitItems.length)
    // Filter offline devices
    .filter((line) => line.includes('emulator') || !line.includes('offline'))
    .map((line) => {
      // unauthorized: ['FA8251A00719', 'unauthorized', 'usb:338690048X', 'transport_id:5']
      // authorized: ['FA8251A00719', 'device', 'usb:336592896X', 'product:walleye', 'model:Pixel_2', 'device:walleye', 'transport_id:4']
      // emulator: ['emulator-5554', 'offline', 'transport_id:1']
      const [pid, ...remainder] = line.split(' ').filter(Boolean);
      const model = remainder.find((item) => item.startsWith('model:'))?.substring(6) || '';
      const deviceType: 'emulator' | 'device' = line.includes('emulator') ? 'emulator' : 'device';

      if (deviceType === 'device') {
        const result: Omit<AndroidConnectedDevice, 'name'> = {
          pid,
          deviceType,
          model,
          osType: 'Android',
          connectionType: line.includes('tcp') ? 'Network' : 'USB',
        };

        return result;
      } else {
        const result: Omit<AndroidEmulator, 'name'> = {
          pid,
          deviceType,
          osType: 'Android',
          state: 'Booted',
        };

        return result;
      }
    })
    .filter(({ pid }) => !!pid);

  const devicePromises = attachedDevices.map(async (device) => {
    let name = 'model' in device ? device.model : '';
    if (device.deviceType === 'emulator' && device.pid) {
      name = (await getAdbNameForEmulatorIdAsync(device.pid)) ?? name;
    }

    const result: AndroidConnectedDevice | AndroidEmulator = {
      ...device,
      name,
    };
    return result;
  });

  return Promise.all(devicePromises);
}

export async function getRunningDeviceAsync(deviceId: string) {
  const runningDevices = await getRunningDevicesAsync();
  const device = runningDevices.find(({ name }) => name === deviceId);
  if (!device?.pid) {
    throw new Error(`No running device or emulator with name ${deviceId}`);
  }

  return device as typeof device & { pid: string };
}

export async function getFirstRunningEmulatorAsync(): Promise<AndroidEmulator | null> {
  const emulators = (await getRunningDevicesAsync()).filter(isAndroidEmulator);
  return emulators[0] ?? null;
}

/**
 * Returns true if emulator is booted
 *
 * @param emulatorPid
 */
export async function isEmulatorBootedAsync(emulatorPid: string): Promise<boolean> {
  try {
    const { stdout } = await adbAsync('-s', emulatorPid, 'shell', 'getprop', 'sys.boot_completed');
    if (stdout.trim() === '1') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function waitForEmulatorToBeBootedAsync(
  maxWaitTimeMs: number,
  intervalMs: number
): Promise<AndroidEmulator> {
  Log.newLine();
  Log.log('Waiting for the Android emulator to start...');

  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitTimeMs) {
    const emulator = await getFirstRunningEmulatorAsync();
    if (emulator?.pid && (await isEmulatorBootedAsync(emulator.pid))) {
      return emulator;
    }
    await sleepAsync(intervalMs);
  }
  throw new Error('Timed out waiting for the Android emulator to start.');
}

function isAndroidEmulator(
  device: AndroidConnectedDevice | AndroidEmulator
): device is AndroidEmulator {
  return device.deviceType === 'emulator';
}
