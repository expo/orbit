import { autoUpdater } from 'electron';

import { AutoUpdaterType } from '../src/AutoUpdater.types';

const AutoUpdaterModule: AutoUpdaterType & { name: string } = {
  name: 'AutoUpdater',
  checkForUpdates: () => {
    autoUpdater.checkForUpdates();
  },
  getAutomaticallyChecksForUpdates: async () => {
    return true;
  },
  setAutomaticallyChecksForUpdates(value: boolean) {},
};

export default AutoUpdaterModule;
