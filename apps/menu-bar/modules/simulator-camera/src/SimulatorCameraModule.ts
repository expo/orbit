import { requireNativeModule, LegacyEventEmitter } from 'expo-modules-core';
import { NativeModule } from 'react-native';

import { NativeSimulatorCameraModule } from './types';

const SimulatorCameraModule = requireNativeModule<NativeModule & NativeSimulatorCameraModule>(
  'SimulatorCamera'
);
export const emitter = new LegacyEventEmitter(SimulatorCameraModule);

export const isSupported = true;

export default SimulatorCameraModule;
