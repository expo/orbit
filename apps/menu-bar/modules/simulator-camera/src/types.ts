export type SimulatorCameraStatus = {
  installed: boolean;
  streaming: boolean;
  cameraName?: string;
  error?: string;
};

export interface NativeSimulatorCameraModule {
  getStatus(): Promise<SimulatorCameraStatus>;
  install(): Promise<SimulatorCameraStatus>;
  uninstall(): Promise<SimulatorCameraStatus>;
  start(): Promise<SimulatorCameraStatus>;
  stop(): Promise<SimulatorCameraStatus>;
}
