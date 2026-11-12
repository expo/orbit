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

    await Simulator.ensureSimulatorAppOpenedAsync(id);
    // Also for a simulator that runs: bring its window to the front.
    return await Simulator.activateSimulatorWindowAsync(id);
  }

  const runningEmulators = await Emulator.getRunningDevicesAsync();
  const runningEmulator = runningEmulators.find(({ name }) => name === id);
  if (runningEmulator) {
    // Bring its window to the front.
    if (runningEmulator.deviceType === 'emulator') {
      await Emulator.activateEmulatorWindowAsync(runningEmulator);
    }
    return;
  }

  await Emulator.bootEmulatorAsync(
    {
      name: id,
    } as AndroidEmulator,
    { audio }
  );
}
