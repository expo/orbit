import { NativeSimulatorCameraModule, SimulatorCameraStatus } from './types';

// The virtual camera needs the iOS Simulator, which only runs on macOS. Electron (Windows and
// Linux) gets a module that reports it as unsupported.
const unsupported = () =>
  Promise.reject(new Error('The simulator camera is only available on macOS.'));

const status: SimulatorCameraStatus = {
  enabled: false,
  framesDirectory: '',
  simulators: [],
  sources: {},
  sourceErrors: {},
};

export const isSupported = false;

export const emitter = {
  addListener: () => ({ remove: () => {} }),
};

const SimulatorCameraModule: NativeSimulatorCameraModule = {
  framesDirectory: '',
  getStatus: () => Promise.resolve(status),
  setEnabled: unsupported,
  setSource: unsupported,
  refreshSimulators: () => Promise.resolve(status),
  listMacCameras: () => Promise.resolve([]),
};

export default SimulatorCameraModule;
