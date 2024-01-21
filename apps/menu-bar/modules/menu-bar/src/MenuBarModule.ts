import { requireNativeModule } from 'expo-modules-core';
import { NativeModule } from 'react-native';

import { NativeMenuBarModule } from './types';

export default requireNativeModule<NativeModule & NativeMenuBarModule>('MenuBar');
