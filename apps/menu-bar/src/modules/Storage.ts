import AsyncStorage from '@react-native-async-storage/async-storage';
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

export const getUserPreferences = async () => {
  const stringValue = await AsyncStorage.getItem(userPreferencesStorageKey);
  const value = (stringValue ? JSON.parse(stringValue) : defaultUserPreferences) as UserPreferences;
  return value;
};

export const saveUserPreferences = async (preferences: UserPreferences) => {
  await AsyncStorage.setItem(userPreferencesStorageKey, JSON.stringify(preferences));
};

const selectedDevicesIdsStorageKey = 'selected-devices-ids';
export type SelectedDevicesIds = {
  android?: string;
  ios?: string;
};

export const getSelectedDevicesIds = async () => {
  const value = await AsyncStorage.getItem(selectedDevicesIdsStorageKey);
  const selectedDevicesIds = JSON.parse(value ?? '{}') as SelectedDevicesIds;
  return selectedDevicesIds;
};

export const saveSelectedDevicesIds = async (devicesIds: SelectedDevicesIds) => {
  await AsyncStorage.setItem(selectedDevicesIdsStorageKey, JSON.stringify(devicesIds));
};

export const resetStorage = async () => AsyncStorage.clear();

export const storage = new MMKV();
