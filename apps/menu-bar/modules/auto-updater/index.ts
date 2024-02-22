import AutoUpdater from './src/AutoUpdaterModule';

export default {
  ...AutoUpdater,
  checkForUpdates: () => AutoUpdater.checkForUpdates(),
  getAutomaticallyChecksForUpdates: () => AutoUpdater.getAutomaticallyChecksForUpdates(),
};
