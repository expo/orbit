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
  showWatchosSimulators: boolean;
  showAndroidEmulators: boolean;
  showCloudSimulators: boolean;
  framelessCloudSimulator: boolean;
};

export const defaultUserPreferences: UserPreferences = {
  launchOnLogin: false,
  emulatorWithoutAudio: false,
  // Controls the whole iOS section (simulators on macOS, physical iPhones on all
  // platforms). Enabled everywhere so connected iPhones are discoverable.
  showIosSimulators: true,
  showTvosSimulators: false,
  showWatchosSimulators: Platform.OS === 'macos',
  showAndroidEmulators: true,
  // EAS Simulator is still limited access, so the entry point stays opt-in even
  // for accounts that have the feature gate.
  showCloudSimulators: false,
  // Design B: a borderless window shaped by the preview's own device bezel.
  framelessCloudSimulator: false,
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
  tvos?: string;
  watchos?: string;
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

const cloudSimulatorSessionIdsStorageKey = 'cloud-simulator-session-ids';
const lastCloudSimulatorAppIdStorageKey = 'cloud-simulator-last-app-id';

/**
 * Active EAS Simulator sessions bill until they are stopped, so their ids are
 * persisted. On the next launch Orbit re-queries them and can still offer Stop
 * for a session it started before a reload or a crash.
 */
export const getCloudSimulatorSessionIds = (): string[] => {
  const value = storage.getString(cloudSimulatorSessionIdsStorageKey);
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
};

export const saveCloudSimulatorSessionIds = (sessionIds: string[]) => {
  storage.set(cloudSimulatorSessionIdsStorageKey, JSON.stringify(sessionIds));
};

export const getLastCloudSimulatorAppId = () =>
  storage.getString(lastCloudSimulatorAppIdStorageKey);

export const saveLastCloudSimulatorAppId = (appId: string) => {
  storage.set(lastCloudSimulatorAppIdStorageKey, appId);
};

const openCloudSimulatorSessionIdStorageKey = 'cloud-simulator-open-session-id';

/**
 * Secondary windows are separate React roots — separate renderer processes under
 * Electron — so they cannot read the popover's context. Storage is the channel
 * the rest of the app already uses for cross-window state, so the simulator
 * window picks up which session to show from here and queries it by id.
 */
export const getOpenCloudSimulatorSessionId = () =>
  storage.getString(openCloudSimulatorSessionIdStorageKey);

export const saveOpenCloudSimulatorSessionId = (sessionId: string | undefined) => {
  if (sessionId === undefined) {
    storage.delete(openCloudSimulatorSessionIdStorageKey);
  } else {
    storage.set(openCloudSimulatorSessionIdStorageKey, sessionId);
  }
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
      (oldStorage.getBuffer(key) as ArrayBuffer);

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
