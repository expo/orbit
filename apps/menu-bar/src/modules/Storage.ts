import { StorageUtils } from 'common-types';
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

import { apolloClient } from '../api/ApolloClient';
import { setSessionAsync } from '../commands/setSessionAsync';
import MenuBarModule from '../modules/MenuBarModule';

export const userPreferencesStorageKey = 'user-preferences';
export const sessionSecretStorageKey = 'sessionSecret';

export type UserPreferences = {
  launchOnLogin: boolean;
  emulatorWithoutAudio: boolean;
  customSdkPath?: string;
  showIosSimulators: boolean;
  showTvosSimulators: boolean;
  showAndroidEmulators: boolean;
};

export const defaultUserPreferences: UserPreferences = {
  launchOnLogin: false,
  emulatorWithoutAudio: false,
  showIosSimulators: Platform.OS === 'macos',
  showTvosSimulators: false,
  showAndroidEmulators: true,
};

export const getUserPreferences = () => {
  const stringValue = storage.getString(userPreferencesStorageKey);
  const value = (stringValue ? JSON.parse(stringValue) : {}) as UserPreferences;
  return { ...defaultUserPreferences, ...value };
};

export const saveUserPreferences = (preferences: UserPreferences) => {
  storage.set(userPreferencesStorageKey, JSON.stringify(preferences));
};

const selectedDevicesIdsStorageKey = 'selected-devices-ids';
export type SelectedDevicesIds = {
  android?: string;
  ios?: string;
};

export const getSelectedDevicesIds = () => {
  const value = storage.getString(selectedDevicesIdsStorageKey);
  const selectedDevicesIds = (
    value
      ? JSON.parse(value)
      : {
          android: undefined,
          ios: undefined,
        }
  ) as SelectedDevicesIds;
  return selectedDevicesIds;
};

export const saveSelectedDevicesIds = (devicesIds: SelectedDevicesIds) => {
  storage.set(selectedDevicesIdsStorageKey, JSON.stringify(devicesIds));
};

export const resetStorage = () => {
  storage.clearAll();
};

export const storage = new MMKV({
  id: StorageUtils.MMKVInstanceId,
  path:
    Platform.OS !== 'web' ? StorageUtils.getExpoOrbitDirectory(MenuBarModule.homedir) : undefined,
});

const migratedStorageKey = 'migratedFromOldPath';
// Migrate MMKV storage to new path so that it's accessible from the CLI
function migrateMMKVFromOldStoragePath() {
  const oldStorage = new MMKV();
  const keys = oldStorage.getAllKeys();

  for (const key of keys) {
    const value =
      oldStorage.getString(key) ??
      oldStorage.getBoolean(key) ??
      oldStorage.getNumber(key) ??
      oldStorage.getBuffer(key);

    if (value != null) {
      storage.set(key, value);
    }
  }

  storage.set(migratedStorageKey, true);
}
if (!storage.getBoolean(migratedStorageKey) && Platform.OS !== 'web') {
  migrateMMKVFromOldStoragePath();
}

const hasSetSessionFile = 'hasSetSessionFile';
if (!storage.getBoolean(hasSetSessionFile) && Platform.OS !== 'web') {
  setSessionAsync(storage.getString(sessionSecretStorageKey) ?? '');
  storage.set(hasSetSessionFile, true);
}

export function saveSessionSecret(sessionSecret: string | undefined) {
  if (sessionSecret === undefined) {
    storage.delete(sessionSecretStorageKey);
  } else {
    storage.set(sessionSecretStorageKey, sessionSecret);
  }
  setSessionAsync(sessionSecret ?? '');
}

export function resetApolloStore() {
  apolloClient.resetStore();
  storage.delete('apollo-cache-persist');
}

export type Log = { command: string; info: string };
export class Logs {
  private logs = this.get();

  push(log: Log) {
    this.logs.push(log);
    if (Platform.OS === 'web') {
      localStorage.setItem('logs', JSON.stringify(this.logs));
    }
  }

  get(): Log[] {
    if (Platform.OS === 'web') {
      return JSON.parse(localStorage.getItem('logs') ?? '[]');
    }
    return this.logs ?? [];
  }
}
