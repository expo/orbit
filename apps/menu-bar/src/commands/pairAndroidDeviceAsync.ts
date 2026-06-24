import { PairAndroidDeviceResult } from 'common-types/build/cli-commands/pairAndroidDevice';

import MenuBarModule from '../modules/MenuBarModule';

// CLI status-stream markers. Kept private — callers get semantic callbacks below.
const DEVICE_PAIRED_LOG = '[orbit] device paired';
const QR_CODE_LOG_PREFIX = '[orbit] qr-code ';

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

type PairAndroidDeviceAsyncOptions = {
  pairingAddress: string;
  pairingCode: string;
  connectAddress?: string;
};

/** Fires once pairing succeeds, before the (slower) background connect step. */
type PairedCallback = { onPaired?: () => void };

export const pairAndroidDeviceAsync = async (
  { pairingAddress, pairingCode, connectAddress }: PairAndroidDeviceAsyncOptions,
  { onPaired }: PairedCallback = {}
) => {
  const args = [
    '--mode',
    'code',
    '--pairing-address',
    pairingAddress,
    '--pairing-code',
    pairingCode,
  ];
  if (connectAddress) {
    args.push('--connect-address', connectAddress);
  }

  const stringResult = await MenuBarModule.runCli('pair-android-device', args, (status) => {
    if (status.includes(DEVICE_PAIRED_LOG)) {
      onPaired?.();
    }
  });

  return JSON.parse(stringResult) as PairAndroidDeviceResult;
};

/**
 * Starts a QR pairing session. The CLI mints the pairing secret and streams the
 * ready QR payload (delivered via `onQrCode`) for the app to render, then waits
 * for the device to scan it. `onPaired` fires once paired; the promise resolves
 * after the background connect finishes (or the CLI times out).
 */
export const pairAndroidDeviceWithQRCodeAsync = async ({
  onQrCode,
  onPaired,
}: PairedCallback & { onQrCode?: (qrContent: string) => void } = {}) => {
  const stringResult = await MenuBarModule.runCli(
    'pair-android-device',
    ['--mode', 'qr'],
    (status) => {
      const qrContent = extractLogValue(status, QR_CODE_LOG_PREFIX);
      if (qrContent) {
        onQrCode?.(qrContent);
      }
      if (status.includes(DEVICE_PAIRED_LOG)) {
        onPaired?.();
      }
    }
  );

  return JSON.parse(stringResult) as PairAndroidDeviceResult;
};

export type AndroidPairingService = { name: string; address: string };

/**
 * List Android devices currently in Wi-Fi pairing mode (discovered over mDNS),
 * so the user can pick one to pair with instead of typing its address.
 */
export const listAndroidPairingServicesAsync = async (): Promise<AndroidPairingService[]> => {
  const stringResult = await MenuBarModule.runCli('list-android-pairing-services', [], undefined);

  return JSON.parse(stringResult) as AndroidPairingService[];
};
