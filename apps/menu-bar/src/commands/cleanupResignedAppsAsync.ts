import MenuBarModule from '../modules/MenuBarModule';
import { getResignedAppsDirectory, listResignedApps } from '../modules/ResignedApps';

/**
 * Delete managed resigned-app directories that no longer back a record.
 * File operations run in the CLI — Electron's MenuBarModule has no runCommand.
 */
export async function cleanupResignedAppsAsync(): Promise<void> {
  const keep = listResignedApps().map((record) => record.recordDirName);
  await MenuBarModule.runCli('cleanup-resigned-apps', [
    '--dir',
    getResignedAppsDirectory(),
    '--keep',
    JSON.stringify(keep),
  ]);
}
