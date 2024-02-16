export const MMKVInstanceId = 'mmkv.default';
const AUTH_FILE_NAME = 'auth.json';

export function getExpoOrbitDirectory(homedir: string) {
  return `${homedir}/.expo/orbit`;
}

export function userSettingsFile(homedir: string): string {
  return `${getExpoOrbitDirectory(homedir)}/${AUTH_FILE_NAME}`;
}

export type UserSettingsData = {
  sessionSecret?: string;
  envVars?: Record<string, string>;
};
