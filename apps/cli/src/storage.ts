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

export function getCustomTrustedSources(): string[] {
  const userSettings = userSettingsJsonFile().read();
  return userSettings.trustedSources || [];
}

export async function setCustomTrustedSources(trustedSources: string[] | undefined): Promise<void> {
  await userSettingsJsonFile().setAsync('trustedSources', trustedSources);
}

export function getMcpToken(): string | undefined {
  const userSettings = userSettingsJsonFile().read();
  return userSettings.mcpToken;
}

export async function setMcpToken(mcpToken: string): Promise<void> {
  await userSettingsJsonFile().setAsync('mcpToken', mcpToken);
}

type UserData = {
  sessionSecret?: string;
  trustedSources?: string[];
  mcpToken?: string;
};

function userSettingsJsonFile(): JsonFile<UserData> {
  return new JsonFile<UserData>(StorageUtils.userSettingsFile(os.homedir()), {
    jsonParseErrorDefault: {},
    cantReadFileDefault: {},
  });
}
