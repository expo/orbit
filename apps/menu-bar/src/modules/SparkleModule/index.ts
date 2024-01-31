import { NativeModule, NativeModules } from 'react-native';

type SparkleModuleType = NativeModule & {
  checkForUpdates: () => void;
  getAutomaticallyChecksForUpdates: () => Promise<boolean>;
  setAutomaticallyChecksForUpdates: (value: boolean) => void;
};

const SparkleModule: SparkleModuleType = NativeModules.SparkleModule;

export default {
  ...SparkleModule,
  checkForUpdates: () => SparkleModule.checkForUpdates(),
  getAutomaticallyChecksForUpdates: () => SparkleModule.getAutomaticallyChecksForUpdates(),
};
