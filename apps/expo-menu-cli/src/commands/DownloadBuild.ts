import { downloadAndMaybeExtractAppAsync, AppPlatform } from "eas-shared";

export async function downloadBuild(buildURL: string) {
  const buildPath = await downloadAndMaybeExtractAppAsync(
    buildURL,
    AppPlatform.Ios
  );
  return buildPath;
}
