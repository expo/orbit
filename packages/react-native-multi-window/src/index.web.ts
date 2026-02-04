import { AppRegistry } from 'react-native';
import { requireElectronModule } from 'react-native-electron-modules/build/requireElectronModule';

import type { WindowsConfig, WindowsManagerType } from './types';

export { WindowStyleMask } from './types';
export type { WindowOptions, WindowsConfig, WindowsManagerType } from './types';
export { WindowProvider, withWindowProvider, useWindowId } from './WindowProvider';
export { useWindowFocusEffect } from './useWindowFocus';

export const WindowManager = requireElectronModule<WindowsManagerType>('WindowManager');

export function createWindowsNavigator<T extends WindowsConfig>(
  config: T,
  wrapComponent: (component: React.ComponentType<any>, id: string) => React.ComponentType<any>
) {
  Object.entries(config).forEach(([key, value]) => {
    AppRegistry.registerComponent(key, () => wrapComponent(value.component, key));
  });

  return {
    open: (windowName: keyof T) => {
      WindowManager.openWindow(String(windowName), config[windowName].options || {});
    },
    close: (window: keyof T) => {
      WindowManager.closeWindow(String(window));
    },
  };
}
