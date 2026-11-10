import { AndroidEmulator, IosSimulator } from 'common-types/build/devices';
import { Emulator, Simulator } from 'eas-shared';

import { bootRemoteSimulatorAsync, isRemoteSimulatorId } from './RemoteSimulator';

type BootDeviceAsyncOptions = {
  platform: 'android' | 'ios';
  id: string;
  audio?: boolean;
  appId?: string;
  archiveUrl?: string;
  openUrl?: string;
  maxRunTime?: string;
  name?: string;
  deviceIdentifier?: string;
  buildId?: string;
  expoGo?: boolean;
  sdkVersion?: string;
  launchArgs?: string;
  tags?: string;
  sessionType?: string;
};

export async function bootDeviceAsync({ platform, id, audio, ...remote }: BootDeviceAsyncOptions) {
  if (isRemoteSimulatorId(id)) {
    return await bootRemoteSimulatorAsync({ platform, ...remote });
  }

  if (platform === 'ios') {
    await Simulator.ensureSimulatorBootedAsync({
      udid: id,
    } as IosSimulator);

    return await Simulator.ensureSimulatorAppOpenedAsync(id);
  }

  const runningEmulators = await Emulator.getRunningDevicesAsync();
  if (runningEmulators.some(({ name }) => name === id)) {
    return;
  }

  await Emulator.bootEmulatorAsync(
    {
      name: id,
    } as AndroidEmulator,
    { audio }
  );
}
