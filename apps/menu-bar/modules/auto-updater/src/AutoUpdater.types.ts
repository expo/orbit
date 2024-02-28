export type AutoUpdaterType = {
  checkForUpdates: () => void;
  getAutomaticallyChecksForUpdates: () => Promise<boolean>;
  setAutomaticallyChecksForUpdates: (value: boolean) => void;
};
