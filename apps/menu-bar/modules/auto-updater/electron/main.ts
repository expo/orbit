import Updater from './Updater';
import { AutoUpdaterType } from '../src/AutoUpdater.types';

const updater = new Updater();
updater.init({
  url: 'https://raw.githubusercontent.com/expo/orbit/main/electron-updates.json  ',
});

const AutoUpdaterModule: AutoUpdaterType & { name: string } = {
  name: 'AutoUpdater',
  checkForUpdates: () => {
    updater.checkForUpdates();
  },
  getAutomaticallyChecksForUpdates: async () => {
    return updater.getAutomaticallyChecksForUpdates();
  },
  setAutomaticallyChecksForUpdates(value: boolean) {
    updater.setAutomaticallyChecksForUpdates(value);
  },
};

export default AutoUpdaterModule;
