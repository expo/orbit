import { requireNativeModule } from 'expo-modules-core';

import { NativeSimulatorCameraModule } from './types';

export default requireNativeModule<NativeSimulatorCameraModule>('SimulatorCamera');
