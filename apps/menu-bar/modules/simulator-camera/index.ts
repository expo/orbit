import SimulatorCameraModule from './src/SimulatorCameraModule';
import { SimulatorCameraStatus } from './src/types';

export type { SimulatorCameraStatus } from './src/types';

export function getStatusAsync(): Promise<SimulatorCameraStatus> {
  return SimulatorCameraModule.getStatus();
}

export function installAsync(): Promise<SimulatorCameraStatus> {
  return SimulatorCameraModule.install();
}

export function uninstallAsync(): Promise<SimulatorCameraStatus> {
  return SimulatorCameraModule.uninstall();
}

export function startAsync(): Promise<SimulatorCameraStatus> {
  return SimulatorCameraModule.start();
}

export function stopAsync(): Promise<SimulatorCameraStatus> {
  return SimulatorCameraModule.stop();
}
