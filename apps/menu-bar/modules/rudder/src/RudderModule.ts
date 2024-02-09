import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import { RudderClient, NativeRudderModule } from './Rudder.types';

const NativeRudder = requireNativeModule<NativeRudderModule>('Rudder');

const RudderModule: RudderClient = {
  async load(writeKey: string, dataPlaneUrl: string): Promise<void> {
    NativeRudder.load(writeKey, dataPlaneUrl);
  },
  async track(event: string, properties?: Record<string, any>) {
    NativeRudder.track(
      event,
      {
        ...properties,
      },
      {
        os: {
          name: Platform.OS,
          version: Platform.Version,
        },
        app: {
          name: 'orbit',
          version: NativeRudder.appVersion,
          type: 'native',
        },
      }
    );
  },
};

export default RudderModule;
