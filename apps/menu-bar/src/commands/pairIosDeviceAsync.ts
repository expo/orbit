import { PairIosDeviceResult } from 'common-types/build/cli-commands/pairIosDevice';

import MenuBarModule from '../modules/MenuBarModule';

// CLI status-stream markers. Kept private — callers get semantic callbacks below.
const ADVERTISING_LOG_PREFIX = '[orbit] advertising ';
const PIN_LOG_PREFIX = '[orbit] pin ';
const DEVICE_PAIRED_LOG = '[orbit] device paired';

/** Value of the first streamed line carrying `prefix`, or undefined. */
function extractLogValue(status: string, prefix: string): string | undefined {
  const index = status.indexOf(prefix);
  if (index === -1) {
    return undefined;
  }
  return (
    status
      .slice(index + prefix.length)
      .split(/\r?\n/)[0]
      .trim() || undefined
  );
}

/**
 * Starts an iOS 27 Remote Device Pairing session. The CLI advertises this computer
 * (`onAdvertising`, with the name the iPhone lists), streams the PIN to type on the iPhone
 * once it picks this computer (`onPin`), and `onPaired` fires as soon as pairing succeeds.
 * The promise resolves with the paired device, or the error (including the timeout).
 */
export const pairIosDeviceAsync = async ({
  onAdvertising,
  onPin,
  onPaired,
}: {
  onAdvertising?: (hostName: string) => void;
  onPin?: (pin: string) => void;
  onPaired?: () => void;
} = {}) => {
  const stringResult = await MenuBarModule.runCli('pair-ios-device', [], (status) => {
    const hostName = extractLogValue(status, ADVERTISING_LOG_PREFIX);
    if (hostName) {
      onAdvertising?.(hostName);
    }
    const pin = extractLogValue(status, PIN_LOG_PREFIX);
    if (pin) {
      onPin?.(pin);
    }
    if (status.includes(DEVICE_PAIRED_LOG)) {
      onPaired?.();
    }
  });

  return JSON.parse(stringResult) as PairIosDeviceResult;
};

/** Forget an iPhone paired over Wi-Fi on this computer. */
export const unpairIosDeviceAsync = async (deviceId: string) => {
  await MenuBarModule.runCli('unpair-ios-device', ['--device-id', deviceId], undefined);
};
