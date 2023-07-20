import MenuBarModule from '../modules/MenuBarModule';

export async function downloadBuildAsync(
  url: string,
  progressCallback: (progress: number) => void,
): Promise<string> {
  return MenuBarModule.runCli('download-build', [url], status => {
    progressCallback(extractDownloadProgress(status));
  });
}

function extractDownloadProgress(string: string) {
  const regex = /(\d+(?:\.\d+)?) MB \/ (\d+(?:\.\d+)?) MB/;
  const matches = string.match(regex);

  if (matches && matches.length === 3) {
    const currentSize = parseFloat(matches[1]);
    const totalSize = parseFloat(matches[2]);
    const progress = (currentSize / totalSize) * 100;
    return progress;
  }

  return 0;
}
