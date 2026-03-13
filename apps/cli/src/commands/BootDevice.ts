import { AndroidEmulator, IosSimulator } from 'common-types/build/devices';
import { Emulator, Simulator } from 'eas-shared';

type BootDeviceAsyncOptions = {
  platform: 'android' | 'ios';
  id: string;
  noAudio?: boolean;
};

export async function bootDeviceAsync({ platform, id, noAudio }: BootDeviceAsyncOptions) {
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
    { noAudio }
  );
}
