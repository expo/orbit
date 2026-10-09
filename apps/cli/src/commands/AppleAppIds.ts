import { listAppIdsForAccountAsync, deleteAppIdForAccountAsync } from 'ipa-resign';

type ListAppIdsOptions = {
  appleId: string;
};

type DeleteAppIdOptions = {
  appleId: string;
  appIdId: string;
};

export async function listAppIdsAsync(options: ListAppIdsOptions) {
  const appIds = await listAppIdsForAccountAsync(options.appleId);
  return appIds.map((appId) => ({
    appIdId: appId.appIdId,
    identifier: appId.identifier,
    name: appId.name,
    expirationDate: appId.expirationDate,
  }));
}

export async function deleteAppIdAsync(options: DeleteAppIdOptions) {
  await deleteAppIdForAccountAsync(options.appleId, options.appIdId);
  return { ok: true };
}
