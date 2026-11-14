import SimulatorCameraModule, { emitter, isSupported } from './src/SimulatorCameraModule';
import { SimulatorCameraStatus } from './src/types';

export * from './src/types';

/** Whether this platform can run the virtual camera (macOS only). */
export const isSimulatorCameraSupported = isSupported;

export function getSimulatorCameraStatusAsync() {
  return SimulatorCameraModule.getStatus();
}

export function setSimulatorCameraEnabledAsync(enabled: boolean) {
  return SimulatorCameraModule.setEnabled(enabled);
}

export const setSimulatorCameraSourceAsync: typeof SimulatorCameraModule.setSource = (
  position,
  source
) => SimulatorCameraModule.setSource(position, source);

export function refreshSimulatorCameraSimulatorsAsync() {
  return SimulatorCameraModule.refreshSimulators();
}

export function listMacCamerasAsync() {
  return SimulatorCameraModule.listMacCameras();
}

/** Calls `listener` when the shim's build, the injected simulators or a source changes. */
export function addSimulatorCameraStatusListener(
  listener: (status: SimulatorCameraStatus) => void
) {
  return emitter.addListener('onStatusChange', listener);
}
