import MenuBarModule from '../modules/MenuBarModule';
import { parseCliJsonResult } from '../utils/helpers';

export type AppleAppId = {
  appIdId: string;
  identifier: string;
  name: string;
  expirationDate?: string;
};

export async function listAppleAppIdsAsync(appleId: string): Promise<AppleAppId[]> {
  const result = await MenuBarModule.runCli('list-app-ids', ['--apple-id', appleId]);
  return parseCliJsonResult<AppleAppId[]>(result, 'list-app-ids');
}

export async function deleteAppleAppIdAsync(appleId: string, appIdId: string): Promise<void> {
  await MenuBarModule.runCli('delete-app-id', ['--apple-id', appleId, '--app-id-id', appIdId]);
}
