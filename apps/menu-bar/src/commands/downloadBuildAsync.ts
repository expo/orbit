import MenuBarModule from '../modules/MenuBarModule';
import { extractDownloadProgress } from '../utils/helpers';

export async function downloadBuildAsync(
  url: string,
  progressCallback: (progress: number) => void
): Promise<string> {
  return MenuBarModule.runCli('download-build', [url], (status) => {
    progressCallback(extractDownloadProgress(status));
  });
}
