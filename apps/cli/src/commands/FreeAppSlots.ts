import { AppleDevice, FREE_APP_LIMIT } from 'eas-shared';

type FreeAppSlotsOptions = {
  deviceId: string;
};

/**
 * The apps on a physical iOS device that hold one of the three slots a free
 * Apple ID gets, read from the device's provisioning-profile store. The menu bar
 * checks this before a resign or install so a full device is handled up front
 * instead of after an upload fails.
 */
export async function freeAppSlotsAsync(options: FreeAppSlotsOptions) {
  const apps = await AppleDevice.listFreeProfileAppsAsync(options.deviceId);
  return { limit: FREE_APP_LIMIT, apps };
}
