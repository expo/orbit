import { PairAndroidDeviceResult } from 'common-types/build/cli-commands/pairAndroidDevice';

import MenuBarModule from '../modules/MenuBarModule';

type PairAndroidDeviceAsyncOptions = {
  pairingAddress: string;
  pairingCode: string;
  connectAddress?: string;
};

export const pairAndroidDeviceAsync = async ({
  pairingAddress,
  pairingCode,
  connectAddress,
}: PairAndroidDeviceAsyncOptions) => {
  const args = ['--pairing-address', pairingAddress, '--pairing-code', pairingCode];
  if (connectAddress) {
    args.push('--connect-address', connectAddress);
  }

  const stringResult = await MenuBarModule.runCli('pair-android-device', args, undefined);

  return JSON.parse(stringResult) as PairAndroidDeviceResult;
};
