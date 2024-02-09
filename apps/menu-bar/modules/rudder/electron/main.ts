import { app } from 'electron';
import os from 'os';

const RudderModule = {
  name: 'Rudder',
  appVersion: app.getVersion(),
  osVersion: os.release(),
};

export default RudderModule;
