import { StorageUtils } from 'common-types';
import { MMKV } from 'react-native-mmkv';

import MenuBarModule from './MenuBarModule';
import { apolloClient } from '../api/ApolloClient';

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
  showIosSimulators: true,
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

const oldStorage = new MMKV();
export const storage = new MMKV({
  id: StorageUtils.MMKVInstanceId,
  path: StorageUtils.getExpoOrbitDirectory(MenuBarModule.constants.homedir),
});

const migratedStorageKey = 'migratedFromOldPath';
// Migrate MMKV storage to new path so that it's accessible from the CLI
function migrateMMKVFromOldStoragePath() {
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
if (!storage.getBoolean(migratedStorageKey)) {
  migrateMMKVFromOldStoragePath();
}

export function saveSessionSecret(sessionSecret: string) {
  storage.set(sessionSecretStorageKey, sessionSecret);
}

export function resetApolloStore() {
  apolloClient.resetStore();
  storage.delete('apollo-cache-persist');
}
