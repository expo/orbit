import { requireNativeModule, EventEmitter } from 'expo-modules-core';
import { NativeModule } from 'react-native';

import { NativeMenuBarModule } from './types';

const MenuBarModule = requireNativeModule<NativeModule & NativeMenuBarModule>('MenuBar');
export const emitter = new EventEmitter(MenuBarModule);

export default MenuBarModule;
