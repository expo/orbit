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
  showRemoteDevices: boolean;
  /** Opens the page of a remote session in the browser when the session starts. */
  openRemoteSessionInBrowser: 'always' | 'ask' | 'never';
  showProjects: boolean;
  showBuilds: boolean;
  autoRenewResignedApps: boolean;
};

export const defaultUserPreferences: UserPreferences = {
  launchOnLogin: false,
  emulatorWithoutAudio: false,
  // Re-sign free-Apple-ID apps automatically before their 7-day profile
  // expires. On by default: renewing touches no device until it reconnects,
  // and signing in was an explicit user action.
  autoRenewResignedApps: true,
  // Controls the whole iOS section (simulators on macOS, physical iPhones on all
  // platforms). Enabled everywhere so connected iPhones are discoverable.
  showIosSimulators: true,
  showTvosSimulators: false,
  showWatchosSimulators: Platform.OS === 'macos',
  showAndroidEmulators: true,
  showRemoteDevices: true,
  openRemoteSessionInBrowser: 'always',
  showProjects: true,
  showBuilds: true,
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

const lastRemoteSimulatorAppIdStorageKey = 'last-remote-simulator-app-id';
// The sessions that ended and that the user did not archive, as a JSON list.
export const endedRemoteSessionsStorageKey = 'ended-remote-sessions';
// The default controller of a session. The header of the Remote devices section and the
// "Create new simulator" window set it.
const lastRemoteSimulatorControllerStorageKey = 'last-remote-simulator-controller';
export const getLastRemoteSimulatorController = () =>
  storage.getString(lastRemoteSimulatorControllerStorageKey);
export const saveLastRemoteSimulatorController = (controller: string) => {
  storage.set(lastRemoteSimulatorControllerStorageKey, controller);
};

// What a click on a project tile does: `page` (the default) or `latest`.
const projectActionStorageKey = 'project-action';
export const getProjectAction = () => storage.getString(projectActionStorageKey);
export const saveProjectAction = (action: string) => {
  storage.set(projectActionStorageKey, action);
};

// The order that the user gave to the devices of each section, and the devices that the
// user hid. Keys of `order` are section keys (`ios`, `android`, …). Values are device ids.
export const deviceListStorageKey = 'device-list';
export type DeviceListPreferences = { order: Record<string, string[]>; hidden: string[] };
export const getDeviceListPreferences = (): DeviceListPreferences => {
  const value = storage.getString(deviceListStorageKey);
  return { order: {}, hidden: [], ...(value ? JSON.parse(value) : {}) };
};
export const saveDeviceListPreferences = (preferences: DeviceListPreferences) => {
  storage.set(deviceListStorageKey, JSON.stringify(preferences));
};

// The account that the user selected in the account row of the popover.
export const selectedAccountNameStorageKey = 'selected-account-name';
export const getSelectedAccountName = () => storage.getString(selectedAccountNameStorageKey);
export const saveSelectedAccountName = (name: string) => {
  storage.set(selectedAccountNameStorageKey, name);
};

export const getLastRemoteSimulatorAppId = () =>
  storage.getString(lastRemoteSimulatorAppIdStorageKey);
export const saveLastRemoteSimulatorAppId = (appId: string) => {
  storage.set(lastRemoteSimulatorAppIdStorageKey, appId);
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
