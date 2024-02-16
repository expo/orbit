import { StorageUtils } from 'common-types';
import os from 'os';
import JsonFile from '@expo/json-file';

export function getSessionSecret(): string | undefined {
  const userSettings = userSettingsJsonFile().read();
  return userSettings.sessionSecret;
}

export async function setSessionSecret(sessionSecret: string): Promise<void> {
  await userSettingsJsonFile().setAsync('sessionSecret', sessionSecret);
}

type UserData = {
  sessionSecret?: string;
};
function userSettingsJsonFile(): JsonFile<UserData> {
  return new JsonFile<UserData>(StorageUtils.userSettingsFile(os.homedir()), {
    jsonParseErrorDefault: {},
    cantReadFileDefault: {},
  });
}
