import { NativeSimulatorCameraModule, SimulatorCameraStatus } from './types';

const unsupportedStatus: SimulatorCameraStatus = {
  installed: false,
  streaming: false,
  error: 'Simulator Camera is only available in Expo Orbit for macOS.',
};

const SimulatorCameraModule: NativeSimulatorCameraModule = {
  getStatus: async () => unsupportedStatus,
  install: async () => unsupportedStatus,
  uninstall: async () => unsupportedStatus,
  start: async () => unsupportedStatus,
  stop: async () => unsupportedStatus,
};

export default SimulatorCameraModule;
