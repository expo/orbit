import { Emulator, Simulator } from 'eas-shared';

type StopDeviceAsyncOptions = {
  platform: 'android' | 'ios';
  id: string;
};

/** Stops a local iOS simulator (by UDID) or Android emulator (by AVD name). */
export async function stopDeviceAsync({ platform, id }: StopDeviceAsyncOptions) {
  if (platform === 'ios') {
    return await Simulator.shutdownSimulatorAsync(id);
  }
  await Emulator.stopEmulatorAsync(id);
}
