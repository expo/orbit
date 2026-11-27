import { InternalError } from 'common-types';
import { AppleConnectedDevice } from 'common-types/build/devices';
import debug from 'debug';
import { EventEmitter } from 'events';

// The rest of the stack (`discovery`, `pair`, `session`) is loaded with `import()` where it is
// used, so the USB and simulator commands do not load it.
import type { RemoteDeviceSession } from './session';
import { DeviceRecord, deleteDevice, listDevices, loadDevice } from './store';
import { lookupInstalledAsync, uploadAndInstallAppAsync } from '../appleDevice/AppleDevice';
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

function toConnectedDevice(record: DeviceRecord): AppleConnectedDevice {
  return {
    udid: record.udid,
    name: record.name ?? 'iPhone',
    model: record.productType ?? record.model ?? 'iPhone',
    deviceType: 'device',
    connectionType: 'Network',
    pairedOverWifi: true,
    osVersion: record.osVersion ?? '',
    osType: 'iOS',
  };
}

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
  const { advertisementMatchesRecord, discoverOnLan, probe } = await import('./discovery');

  const reachable = new Set<string>();
  // Ends the browse as soon as every paired phone answered at its last known address.
  const everyoneAnswered = new AbortController();
  await Promise.all([
    // ponytail: no `dns-sd` fallback here, it adds 2.5 s or more to every device list. A phone
    // whose address changed on a Mac that blocks our multicast is listed after its next connection.
    discoverOnLan({
      timeoutMs: DISCOVERY_TIMEOUT_MS,
      records,
      signal: everyoneAnswered.signal,
      systemFallback: false,
    })
      .then((found) => {
        for (const entry of found) {
          if (entry.reachable === false) continue;
          for (const record of records) {
            if (advertisementMatchesRecord(entry.txt, record)) reachable.add(record.udid);
          }
        }
      })
      .catch((error) => log('Bonjour discovery failed: %O', error)),
    Promise.all(
      records
        .filter((record) => record.lastHost && record.lastPort)
        .map(async (record) => {
          const result = await probe(record.lastHost!, record.lastPort!, { timeoutMs: 1000 });
          if (result && (!result.peer?.udid || result.peer.udid === record.udid)) {
            reachable.add(record.udid);
          }
        })
    ).then(() => {
      if (reachable.size === records.length) everyoneAnswered.abort();
    }),
  ]);

  return records.filter((record) => reachable.has(record.udid)).map(toConnectedDevice);
}

export type WirelessPairingEvents = {
  /** This computer is now listed on the iPhone under Remote Device Pairing. */
  onAdvertising?: (info: { name: string }) => void;
  /** The iPhone picked this computer; the user must type `pin` on it. */
  onPin?: (pin: string) => void;
  /** The attempt that showed the PIN failed (wrong PIN, phone gave up); still waiting. */
  onPinRejected?: () => void;
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
  onPinRejected,
  onPaired,
}: WirelessPairingEvents & { timeoutMs?: number } = {}): Promise<AppleConnectedDevice> {
  const { pairDevice } = await import('./pair');
  const { RemoteDeviceSession } = await import('./session');
  const pairing = pairDevice({ timeoutMs });
  const events: EventEmitter = pairing.events;
  events.on('advertising', (info: { name: string }) => onAdvertising?.(info));
  events.on('pin', (pin: string) => onPin?.(pin));
  events.on('attempt-failed', (error: Error, pinShown: boolean) => {
    log('Pairing attempt failed: %O', error);
    if (pinShown) onPinRejected?.();
  });

  let record = await pairing;
  onPaired?.();

  // Pair-Setup may only identify the phone by account id. Connect once to learn its real UDID
  // (so it lines up with USB/devicectl listings), name and OS version.
  const session = new RemoteDeviceSession(record);
  try {
    await session.connectAsync();
    record = session.record;
  } catch (error) {
    // Paired regardless; the next successful connection fills in the details.
    log('Paired, but the first connection failed: %O', error);
  } finally {
    session.close();
  }

  return toConnectedDevice(record);
}

/** Stop the pairing session another process is running on this computer, if any. */
export async function cancelWirelessPairing() {
  const { cancelPairing } = await import('./pair');
  cancelPairing();
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
  const { RemoteDeviceSession, NotPairedError } = await import('./session');
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

/** Install an app bundle over Wi-Fi and launch it. */
export async function installAndLaunchAppAsync({
  udid,
  appPath,
  bundleId,
  deltaPath,
  onProgress,
}: {
  udid: string;
  appPath: string;
  bundleId: string;
  deltaPath: string;
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
    try {
      await launchWithSessionAsync(session, { bundleId });
    } catch (error) {
      // The app is installed. Another install path would install it again and hide this error.
      throw new InternalError(
        'APPLE_APP_LAUNCH_FAILED',
        `The app is installed, but it did not launch: ${error instanceof Error ? error.message : error}. Launch the app manually.`
      );
    }
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

/** Display names of installed apps, like AppleDevice.lookupAppNamesAsync but over Wi-Fi. */
export async function lookupAppNamesAsync(
  udid: string,
  bundleIds: string[]
): Promise<Record<string, string>> {
  if (bundleIds.length === 0) return {};
  return withSessionAsync(udid, async (session) => {
    const installed = await lookupInstalledAsync(await getInstallerAsync(session), bundleIds);
    const names: Record<string, string> = {};
    for (const [bundleId, { name }] of Object.entries(installed)) {
      if (name) names[bundleId] = name;
    }
    return names;
  });
}
