import MenuBarModule from '../modules/MenuBarModule';
import { getResignedAppsDirectory, readResignedApps } from '../modules/ResignedApps';

/**
 * Delete managed resigned-app directories that no longer back a record.
 * File operations run in the CLI — Electron's MenuBarModule has no runCommand.
 * The CLI leaves directories written in the last hour alone, so a resign in
 * flight (dir created, record not yet written) survives a concurrent cleanup.
 */
export async function cleanupResignedAppsAsync(): Promise<void> {
  const records = readResignedApps();
  // Unreadable records are not "no records": `--keep []` would delete the
  // original IPAs those records still point at.
  if (!records) return;
  const keep = records.map((record) => record.recordDirName);
  await MenuBarModule.runCli('cleanup-resigned-apps', [
    '--dir',
    getResignedAppsDirectory(),
    '--keep',
    JSON.stringify(keep),
  ]);
}
