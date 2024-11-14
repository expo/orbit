import { requireNativeModule, LegacyEventEmitter } from 'expo-modules-core';
import { NativeModule } from 'react-native';

import { NativeMenuBarModule } from './types';

const MenuBarModule = requireNativeModule<NativeModule & NativeMenuBarModule>('MenuBar');
export const emitter = new LegacyEventEmitter(MenuBarModule);

export default MenuBarModule;
