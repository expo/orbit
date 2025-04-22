import { requireElectronModule } from 'react-native-electron-modules';
import * as rudderanalytics from 'rudder-sdk-js';

import { RudderClient, ElectronRudderModule } from './Rudder.types';

const RudderElectronModule = requireElectronModule<ElectronRudderModule>('Rudder');

const RudderModule: RudderClient = {
  async load(writeKey: string, dataPlaneUrl: string): Promise<void> {
    rudderanalytics.load(writeKey, dataPlaneUrl);
  },
  async track(event: string, properties?: Record<string, any>) {
    rudderanalytics?.track(event, properties, {
      os: {
        name: RudderElectronModule.platform,
        version: RudderElectronModule.osVersion,
      },
      device: {
        model: RudderElectronModule.osArch,
      },
      app: {
        name: 'orbit',
        version: RudderElectronModule.appVersion,
        type: 'electron',
      },
    });
  },
};

export default RudderModule;
