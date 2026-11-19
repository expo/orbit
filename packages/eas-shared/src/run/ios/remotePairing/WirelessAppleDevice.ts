import { InternalError } from 'common-types';
import { AppleConnectedDevice } from 'common-types/build/devices';
import debug from 'debug';
import { EventEmitter } from 'events';

import { advertisementMatchesRecord, discoverOnLan, probe } from './discovery';
import { pairDevice } from './pair';
import { RemoteDeviceSession, NotPairedError } from './session';
import { DeviceRecord, deleteDevice, listDevices, loadDevice, saveDevice } from './store';
import { uploadAndInstallAppAsync } from '../appleDevice/AppleDevice';
import { AFCClient } from '../appleDevice/client/AFCClient';
import {
  InstallationProxyClient,
  OnInstallProgressCallback,
} from '../appleDevice/client/InstallationProxyClient';

const log = debug('expo:remote-pairing');

const AFC_SERVICE = 'com.apple.afc.shim.remote';
const INSTALLATION_PROXY_SERVICE = 'com.apple.mobile.installation_proxy.shim.remote';

/** How long the device list waits for paired iPhones to answer on the network. */
const DISCOVERY_TIMEOUT_MS = 2000;

/** iPhones paired with this computer over Wi-Fi (iOS 27 "Remote Device Pairing"). */
export function getWirelessPairings(): DeviceRecord[] {
  try {
    return listDevices();
  } catch (error) {
    log('Failed to read Wi-Fi pairings: %O', error);
    return [];
  }
}

export function hasWirelessPairing(udid: string): boolean {
  try {
    return Boolean(loadDevice(udid));
  } catch {
    return false;
  }
}

/**
 * Paired iPhones currently reachable on the local network. A paired iPhone advertises
 * `_remotepairing._tcp` with an authTag only we can match, so this never connects to a device
 * that isn't ours; the last known address is probed too, for networks that filter mDNS.
 */
export async function getConnectedWirelessDevicesAsync(): Promise<AppleConnectedDevice[]> {
  const records = getWirelessPairings();
  if (!records.length) return [];

  const reachable = new Set<string>();
  await Promise.all([
    discoverOnLan({ timeoutMs: DISCOVERY_TIMEOUT_MS })
      .then((found) => {
        for (const entry of found) {
          if (entry.reachable === false) continue;
          for (const record of records) {
            if (advertisementMatchesRecord(entry.txt, record)) reachable.add(record.udid);
          }
        }
      })
      .catch((error) => log('Bonjour discovery failed: %O', error)),
    ...records
      .filter((record) => record.lastHost && record.lastPort)
      .map(async (record) => {
        const result = await probe(record.lastHost!, record.lastPort!, { timeoutMs: 1000 });
        if (result && (!result.peer?.udid || result.peer.udid === record.udid)) {
          reachable.add(record.udid);
        }
      }),
  ]);

  return records
    .filter((record) => reachable.has(record.udid))
    .map((record) => ({
      udid: record.udid,
      name: record.name ?? 'iPhone',
      model: record.productType ?? record.model ?? 'iPhone',
      deviceType: 'device',
      connectionType: 'Network',
      osVersion: record.osVersion ?? '',
      osType: 'iOS',
    }));
}

export type WirelessPairingEvents = {
  /** This computer is now listed on the iPhone under Remote Device Pairing. */
  onAdvertising?: (info: { name: string }) => void;
  /** The iPhone picked this computer; the user must type `pin` on it. */
  onPin?: (pin: string) => void;
  /** Pairing succeeded; connecting to read the device details. */
  onPaired?: () => void;
};

/**
 * Advertise this computer as a pairable host and wait for an iPhone to pair with it from
 * Settings → Privacy & Security → Developer Mode → Remote Device Pairing. The phone shows this
 * computer; once picked, a 6-digit PIN is shown here (`onPin`) and typed on the phone.
 */
export async function pairWirelessDeviceAsync({
  timeoutMs,
  onAdvertising,
  onPin,
  onPaired,
}: WirelessPairingEvents & { timeoutMs?: number } = {}): Promise<AppleConnectedDevice> {
  const pairing = pairDevice({ timeoutMs });
  const events: EventEmitter = pairing.events;
  events.on('advertising', (info: { name: string }) => onAdvertising?.(info));
  events.on('pin', (pin: string) => onPin?.(pin));
  events.on('attempt-failed', (error: Error) => log('Pairing attempt failed: %O', error));

  let record: DeviceRecord;
  try {
    record = await pairing;
  } catch (error) {
    if (error instanceof Error && /timed out waiting for the iPhone/.test(error.message)) {
      throw new InternalError(
        'APPLE_WIRELESS_PAIRING_TIMEOUT',
        'Timed out waiting for the iPhone to pair. Make sure it is on the same Wi-Fi network as this computer and open Remote Device Pairing in Developer Mode settings.'
      );
    }
    throw error;
  }
  onPaired?.();

  // Pair-Setup may only identify the phone by account id. Connect once to learn its real UDID
  // (so it lines up with USB/devicectl listings), name and OS version.
  const session = new RemoteDeviceSession(record);
  try {
    await session.connectAsync();
    record = session.record;
    const udid = session.udid;
    if (udid && udid !== record.udid) {
      const previous = record.udid;
      record = saveDevice({ ...record, udid });
      deleteDevice(previous);
    }
  } catch (error) {
    // Paired regardless; the device list connects again once it's reachable.
    log('Paired, but the first connection failed: %O', error);
  } finally {
    session.close();
  }

  return {
    udid: record.udid,
    name: record.name ?? 'iPhone',
    model: record.productType ?? record.model ?? 'iPhone',
    deviceType: 'device',
    connectionType: 'Network',
    osVersion: record.osVersion ?? '',
    osType: 'iOS',
  };
}

/** Forget a Wi-Fi pairing on this computer. The phone keeps listing it until removed there. */
export function unpairWirelessDevice(udid: string) {
  deleteDevice(udid);
}

async function withSessionAsync<T>(
  udid: string,
  action: (session: RemoteDeviceSession) => Promise<T>
): Promise<T> {
  const record = loadDevice(udid);
  if (!record) {
    throw new InternalError(
      'APPLE_DEVICE_NOT_PAIRED',
      'This iPhone is not paired with this computer over Wi-Fi.'
    );
  }
  const session = new RemoteDeviceSession(record);
  try {
    await session.connectAsync();
    return await action(session);
  } catch (error) {
    if (error instanceof NotPairedError) {
      throw new InternalError('APPLE_DEVICE_NOT_PAIRED', error.message);
    }
    throw error;
  } finally {
    session.close();
  }
}

async function getInstallerAsync(session: RemoteDeviceSession) {
  return new InstallationProxyClient(
    (await session.startLockdownServiceAsync(INSTALLATION_PROXY_SERVICE)) as any
  );
}

/** Install an app bundle over Wi-Fi and launch it (optionally with a URL). */
export async function installAndLaunchAppAsync({
  udid,
  appPath,
  bundleId,
  deltaPath,
  url,
  onProgress,
}: {
  udid: string;
  appPath: string;
  bundleId: string;
  deltaPath: string;
  url?: string;
  onProgress: OnInstallProgressCallback;
}) {
  await withSessionAsync(udid, async (session) => {
    const afcClient = new AFCClient((await session.startLockdownServiceAsync(AFC_SERVICE)) as any);
    await uploadAndInstallAppAsync({
      afcClient,
      getInstaller: () => getInstallerAsync(session),
      appPath,
      bundleId,
      deltaPath,
      onProgress,
    });
    await launchWithSessionAsync(session, { bundleId, url });
  });
}

export async function launchAppAsync(options: { udid: string; bundleId: string; url?: string }) {
  await withSessionAsync(options.udid, (session) => launchWithSessionAsync(session, options));
}

async function launchWithSessionAsync(
  session: RemoteDeviceSession,
  { bundleId, url }: { bundleId: string; url?: string }
) {
  const appService = await session.getAppServiceAsync();
  await appService.launch(bundleId, { url });
}

export async function uninstallAppAsync({ udid, bundleId }: { udid: string; bundleId: string }) {
  await withSessionAsync(udid, async (session) => {
    const installer = await getInstallerAsync(session);
    await installer.uninstallApp(bundleId);
  });
}

export async function isAppInstalledAsync(udid: string, bundleId: string): Promise<boolean> {
  return withSessionAsync(udid, async (session) => {
    const installer = await getInstallerAsync(session);
    const result = await installer.lookupApp([bundleId]);
    return Boolean(result[bundleId]);
  });
}
