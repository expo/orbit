import { InternalError } from 'common-types';
import { PairIosDeviceResult } from 'common-types/build/cli-commands/pairIosDevice';
import { AppleDevice } from 'eas-shared';

type PairIosDeviceOptions = {
  /** How long to wait for the iPhone to pair, in milliseconds. */
  timeout?: string;
};

/** Logged once this computer is listed on the iPhone under Remote Device Pairing. */
const ADVERTISING_LOG_PREFIX = '[orbit] advertising ';
/** Logged with the PIN the user types on the iPhone. The menu bar app renders it. */
const PIN_LOG_PREFIX = '[orbit] pin ';
/** Logged the instant pairing succeeds, before the device details are read. */
const DEVICE_PAIRED_LOG = '[orbit] device paired';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Pair an iPhone over Wi-Fi with the iOS 27 Remote Device Pairing flow: this computer is
 * advertised as a pairable host, the user picks it on the iPhone under Settings → Privacy &
 * Security → Developer Mode → Remote Device Pairing, and types the PIN shown here.
 */
export async function pairIosDeviceAsync({
  timeout,
}: PairIosDeviceOptions): Promise<PairIosDeviceResult> {
  try {
    const device = await AppleDevice.pairWirelessDeviceAsync({
      timeoutMs: timeout ? parseInt(timeout, 10) : DEFAULT_TIMEOUT_MS,
      onAdvertising: ({ name }) => console.log(`${ADVERTISING_LOG_PREFIX}${name}`),
      onPin: (pin) => console.log(`${PIN_LOG_PREFIX}${pin}`),
      onPaired: () => console.log(DEVICE_PAIRED_LOG),
    });
    return {
      success: true,
      device: { udid: device.udid, name: device.name, osVersion: device.osVersion },
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: {
          code: error instanceof InternalError ? error.code : 'UNKNOWN_ERROR',
          message: error.message,
        },
      };
    }
    throw error;
  }
}

/** Forget an iPhone paired over Wi-Fi. */
export async function unpairIosDeviceAsync({ deviceId }: { deviceId: string }) {
  AppleDevice.unpairWirelessDevice(deviceId);
  return { success: true };
}
