import { MMKV } from 'react-native-mmkv';

const userPreferencesStorageKey = 'user-preferences';

export type UserPreferences = {
  launchOnLogin: boolean;
  emulatorWithoutAudio: boolean;
  customSdkPath?: string;
  showExperimentalFeatures: boolean;
  showIosSimulators: boolean;
  showTvosSimulators: boolean;
  showAndroidEmulators: boolean;
};

export const defaultUserPreferences: UserPreferences = {
  launchOnLogin: false,
  emulatorWithoutAudio: false,
  showExperimentalFeatures: false,
  showIosSimulators: true,
  showTvosSimulators: false,
  showAndroidEmulators: true,
};

export const getUserPreferences = () => {
  const stringValue = storage.getString(userPreferencesStorageKey);
  const value = (stringValue ? JSON.parse(stringValue) : defaultUserPreferences) as UserPreferences;
  return value;
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

export const storage = new MMKV();
