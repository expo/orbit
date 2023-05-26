import MenuBarModule from './MenuBarModule';

export async function downloadBuildAsync(
  url: string,
  callback: (status: string) => void,
): Promise<string> {
  return MenuBarModule.runCli('download-build', [url], callback);
}
