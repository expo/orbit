import { app } from 'electron';
import os from 'os';

import { type ElectronRudderModule } from '../src/Rudder.types';

const RudderModule: Omit<ElectronRudderModule, 'platform'> = {
  name: 'Rudder',
  appVersion: app.getVersion(),
  osVersion: os.release(),
  osArch: os.arch(),
};

export default RudderModule;
