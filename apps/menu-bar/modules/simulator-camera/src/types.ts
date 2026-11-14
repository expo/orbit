export type SimulatorCameraPosition = 'front' | 'back';

export type SimulatorCameraSourceKind = 'none' | 'macCamera' | 'image' | 'video' | 'qr';

export type SimulatorCameraSource = {
  kind: SimulatorCameraSourceKind;
  /** `image` and `video`: the file path. `qr`: the text to encode. `macCamera`: the camera's ID. */
  value?: string;
  /** How an image or video fills the frame. */
  contentMode?: 'fit' | 'fill';
};

export type SimulatorCameraSimulator = {
  udid: string;
  name: string;
  /** Whether the shim is in the simulator's launchd environment: apps launched from now on get it. */
  injected: boolean;
};

export type SimulatorCameraStatus = {
  enabled: boolean;
  /** The built shim, once it is ready. */
  helperPath?: string;
  /** The last error of building the shim or injecting it. */
  error?: string;
  framesDirectory: string;
  simulators: SimulatorCameraSimulator[];
  sources: Partial<Record<SimulatorCameraPosition, SimulatorCameraSource>>;
  /** Why a position's source does not run, by position. */
  sourceErrors: Partial<Record<SimulatorCameraPosition, string>>;
};

export type MacCamera = { id: string; name: string };

export interface NativeSimulatorCameraModule {
  readonly framesDirectory: string;
  getStatus(): Promise<SimulatorCameraStatus>;
  setEnabled(enabled: boolean): Promise<SimulatorCameraStatus>;
  setSource(
    position: SimulatorCameraPosition,
    source: SimulatorCameraSource
  ): Promise<SimulatorCameraStatus>;
  refreshSimulators(): Promise<SimulatorCameraStatus>;
  listMacCameras(): Promise<MacCamera[]>;
}
