import { InternalError } from 'common-types';
import { PairAndroidDeviceResult } from 'common-types/build/cli-commands/pairAndroidDevice';
import { Emulator } from 'eas-shared';

type PairAndroidDeviceOptions = {
  pairingAddress: string;
  pairingCode: string;
  /**
   * The `ipAddress:port` used to connect to the device. On Android this differs
   * from the pairing address. When omitted, only the pairing step is performed.
   */
  connectAddress?: string;
};

export async function pairAndroidDeviceAsync({
  pairingAddress,
  pairingCode,
  connectAddress,
}: PairAndroidDeviceOptions): Promise<PairAndroidDeviceResult> {
  try {
    await Emulator.pairAndroidDeviceAsync({ pairingAddress, pairingCode });

    if (connectAddress) {
      await Emulator.connectAndroidDeviceAsync(connectAddress);
    }

    return { success: true };
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
