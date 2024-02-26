import semver from 'semver';

import HttpClient from './HttpClient';

type UpdatesJSON = {
  title: string;
  link: string;
  versions: VersionMeta[];
};

export type BuildInfo = {
  url: string;
  sha256?: string;
};

export type VersionMeta = {
  version: string;
  release_notes: string;
  pub_date: string;
  builds: {
    [platform: string]: BuildInfo;
  };
};

/**
 * Return promise containing a JSON with information regarding
 * all available updates
 *
 * @param {HttpClient} httpClient
 * @param {string} updatesUrl
 * @returns {Promise<UpdatesJSON>}
 */
export async function getUpdatesMeta(httpClient: HttpClient, updatesUrl: string) {
  const json: UpdatesJSON = await httpClient.getJson(updatesUrl);

  return json;
}

export function getNewerVersion(
  updatesJSON: UpdatesJSON,
  currentVersion: string
): VersionMeta | undefined {
  const latestVersion = updatesJSON.versions.sort((a, b) =>
    semver.compareLoose(b.version, a.version)
  )[0];

  if (semver.gt(latestVersion.version, currentVersion)) {
    return latestVersion;
  }
}

export function extractBuildInfoFromMeta(updateMeta: VersionMeta, build: string) {
  return updateMeta.builds[build];
}
