import fs from 'fs';
import { resignIpaAsync } from 'ipa-resign';
import path from 'path';

type ResignIpaOptions = {
  ipa: string;
  udid: string;
  deviceName: string;
  appleId: string;
  output?: string;
  stripExtensions?: boolean;
  managedDir?: string;
};

// Directory name for a resigned-app record inside the managed dir. Must be
// filesystem-safe on every platform; the menu-bar stores the returned name and
// passes it back verbatim to `cleanup-resigned-apps --keep`.
export function recordDirName(bundleId: string, udid: string): string {
  return `${bundleId}_${udid}`.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function resignIpaCommandAsync(options: ResignIpaOptions) {
  const result = await resignIpaAsync({
    ipaPath: options.ipa,
    deviceUdid: options.udid,
    deviceName: options.deviceName,
    appleId: options.appleId,
    outputIpaPath: options.output,
    stripExtensions: options.stripExtensions,
    onProgress: (step, detail) => {
      console.log(`step: ${step}${detail ? ` (${detail})` : ''}`);
    },
  });

  // When a managed dir is given, keep a durable copy of the original ipa (the
  // source download is a purgeable temp file and its URL expires, so this copy
  // is what 7-day renewals re-sign) and move the resigned output next to it.
  let resignedIpaPath = result.resignedIpaPath;
  let originalIpaPath: string | undefined;
  let dirName: string | undefined;
  if (options.managedDir) {
    dirName = recordDirName(result.bundleId, options.udid);
    const recordDir = path.join(options.managedDir, dirName);
    fs.mkdirSync(recordDir, { recursive: true });

    originalIpaPath = path.join(recordDir, 'original.ipa');
    if (path.resolve(options.ipa) !== path.resolve(originalIpaPath)) {
      fs.copyFileSync(options.ipa, originalIpaPath);
    }

    const managedResignedPath = path.join(recordDir, 'resigned.ipa');
    if (path.resolve(result.resignedIpaPath) !== path.resolve(managedResignedPath)) {
      // copy + rm instead of rename: the temp download dir and the managed dir
      // can live on different volumes.
      fs.copyFileSync(result.resignedIpaPath, managedResignedPath);
      fs.rmSync(result.resignedIpaPath, { force: true });
    }
    resignedIpaPath = managedResignedPath;
  }

  return {
    resignedIpaPath,
    originalIpaPath,
    recordDirName: dirName,
    bundleId: result.bundleId,
    profileExpiresAt: result.profileExpiresAt.toISOString(),
    strippedEntitlements: result.strippedEntitlements,
  };
}
