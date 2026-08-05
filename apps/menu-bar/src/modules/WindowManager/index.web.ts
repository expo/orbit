import { AppRegistry } from 'react-native';
import { requireElectronModule } from 'react-native-electron-modules/build/requireElectronModule';

import { withWindowProvider } from './WindowProvider';
import { WindowOptions, WindowsConfig, WindowsManagerType } from './types';
import { withFluentProvider } from '../../providers/FluentProvider';
import { withThemeProvider } from '../../utils/useExpoTheme';

export { WindowStyleMask } from './types';

export const WindowManager = requireElectronModule<WindowsManagerType>('WindowManager');

export function createWindowsNavigator<T extends WindowsConfig>(config: T) {
  Object.entries(config).forEach(([key, value]) => {
    AppRegistry.registerComponent(key, () =>
      withWindowProvider(withFluentProvider(withThemeProvider(value.component)), key)
    );
  });

  return {
    /**
     * `optionsOverride` lets a caller decide window style at open time rather than
     * at registration time, so a preference change does not need an app restart.
     */
    open: (windowName: keyof T, optionsOverride?: WindowOptions) => {
      WindowManager.openWindow(
        String(windowName),
        optionsOverride ?? config[windowName].options ?? {}
      );
    },
    close: (window: keyof T) => {
      WindowManager.closeWindow(String(window));
    },
  };
}
