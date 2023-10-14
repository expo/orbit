import { downloadAndMaybeExtractAppAsync, AppPlatform } from 'eas-shared';

export async function downloadBuildAsync(buildURL: string) {
  const buildPath = await downloadAndMaybeExtractAppAsync(
    buildURL,
    buildURL.endsWith('apk') ? AppPlatform.Android : AppPlatform.Ios
  );
  return buildPath;
}
