import { downloadAndMaybeExtractAppAsync } from 'eas-shared';

export async function downloadBuildAsync(buildURL: string) {
  const buildPath = await downloadAndMaybeExtractAppAsync(buildURL);
  return buildPath;
}
