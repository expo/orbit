export interface NativeRudderModule extends RudderClient {
  track(
    event: string,
    properties?: Record<string, any>,
    context?: Record<string, Record<string, any>>
  ): Promise<void>;
  appVersion: string;
}

export interface ElectronRudderModule {
  name: string;
  platform: string;
  appVersion: string;
  osVersion: string;
  osArch: string;
}

export interface RudderClient {
  load(writeKey: string, dataPlaneUrl: string): Promise<void>;
  track(event: string, properties?: Record<string, any>): Promise<void>;
}
