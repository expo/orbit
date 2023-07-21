import AsyncStorage from '@react-native-async-storage/async-storage';

const userPreferencesStorageKey = 'user-preferences';

export type UserPreferences = {
  launchOnLogin?: boolean;
  emulatorWithoutAudio?: boolean;
  customSdkPath?: string;
};

export const getUserPreferences = async () => {
  const value = await AsyncStorage.getItem(userPreferencesStorageKey);
  return JSON.parse(value ?? '{}') as UserPreferences;
};

export const saveUserPreferences = async (preferences: UserPreferences) => {
  await AsyncStorage.setItem(
    userPreferencesStorageKey,
    JSON.stringify(preferences),
  );
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

export const saveSelectedDevicesIds = async (
  devicesIds: SelectedDevicesIds,
) => {
  await AsyncStorage.setItem(
    selectedDevicesIdsStorageKey,
    JSON.stringify(devicesIds),
  );
};

export const resetStorage = async () => AsyncStorage.clear();
