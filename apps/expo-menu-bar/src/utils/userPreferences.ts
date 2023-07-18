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
