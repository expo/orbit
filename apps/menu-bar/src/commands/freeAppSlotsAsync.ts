import MenuBarModule from '../modules/MenuBarModule';
import { parseCliJsonResult } from '../utils/helpers';

export type FreeProfileApp = {
  bundleId: string;
  teamId?: string;
  name?: string;
  expiresAt?: string;
};

export type FreeAppSlots = {
  limit: number;
  /** Apps installed under a free Apple ID's development profile. */
  apps: FreeProfileApp[];
};

/** The apps holding the free-Apple-ID app slots on a device (see the CLI's `free-app-slots`). */
export async function freeAppSlotsAsync(deviceId: string): Promise<FreeAppSlots> {
  const result = await MenuBarModule.runCli('free-app-slots', ['--device-id', deviceId]);
  return parseCliJsonResult<FreeAppSlots>(result, 'free-app-slots');
}
