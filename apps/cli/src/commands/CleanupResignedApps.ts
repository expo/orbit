import fs from 'fs';
import path from 'path';

type CleanupResignedAppsOptions = {
  dir: string;
  keep: string; // JSON array of record dir names to keep
};

// A resign in flight already has its directory but no record yet (the host
// records the app once the install goes through), so anything written recently
// is left for a later cleanup.
const IN_FLIGHT_GRACE_MS = 60 * 60 * 1000;

/**
 * Delete subdirectories of the managed resigned-apps dir that no longer back a
 * record (orphans from removed records or crashed resigns). Only immediate
 * children of `--dir` are ever touched, and never ones modified in the last hour.
 */
export async function cleanupResignedAppsAsync(options: CleanupResignedAppsOptions) {
  const root = path.resolve(options.dir);
  const keep = new Set<string>(JSON.parse(options.keep));
  const removed: string[] = [];
  if (!fs.existsSync(root)) {
    return { removed };
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || keep.has(entry.name)) {
      continue;
    }
    const target = path.resolve(root, entry.name);
    // Refuse anything that resolves outside the managed dir.
    if (!target.startsWith(root + path.sep)) {
      continue;
    }
    if (Date.now() - fs.statSync(target).mtimeMs < IN_FLIGHT_GRACE_MS) {
      continue;
    }
    fs.rmSync(target, { recursive: true, force: true });
    removed.push(entry.name);
  }
  return { removed };
}
