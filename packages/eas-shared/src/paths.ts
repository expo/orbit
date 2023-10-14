import envPaths from 'env-paths';

// Paths for storing things like data, config, cache, etc.
// Should use the correct OS-specific paths (e.g. XDG base directory on Linux)
const {
  data: DATA_PATH,
  config: CONFIG_PATH,
  cache: CACHE_PATH,
  log: LOG_PATH,
  temp: TEMP_PATH,
} = envPaths('expo-orbit');

export const getDataDirectory = (): string => DATA_PATH;
export const getConfigDirectory = (): string => CONFIG_PATH;
export const getCacheDirectory = (): string => CACHE_PATH;
export const getLogDirectory = (): string => LOG_PATH;
export const getTmpDirectory = (): string => TEMP_PATH;
