import { AppRegistry, NativeModules } from 'react-native';

import { withWindowProvider } from './WindowProvider';
import { WindowOptions, WindowStyleMask, WindowsConfig, WindowsManagerType } from './types';
import { withThemeProvider } from '../../utils/useExpoTheme';

export { WindowStyleMask } from './types';

type NativeWindowOptions = Omit<WindowOptions, 'windowStyle'> & {
  windowStyle?: Omit<WindowOptions['windowStyle'], 'mask'> & {
    mask?: number;
  };
};

type NativeWindowsManagerType = WindowsManagerType & {
  openWindow: (window: string, options: NativeWindowOptions) => Promise<void>;
};
const WindowsManager: NativeWindowsManagerType = NativeModules.WindowsManager;
const WindowsManagerConstants = NativeModules.WindowsManager.getConstants();

function getWindowStyleMaskValue(mask: WindowStyleMask) {
  switch (mask) {
    case WindowStyleMask.Borderless:
      return WindowsManagerConstants.STYLE_MASK_BORDERLESS;
    case WindowStyleMask.Titled:
      return WindowsManagerConstants.STYLE_MASK_TITLED;
    case WindowStyleMask.Closable:
      return WindowsManagerConstants.STYLE_MASK_CLOSABLE;
    case WindowStyleMask.Miniaturizable:
      return WindowsManagerConstants.STYLE_MASK_MINIATURIZABLE;
    case WindowStyleMask.Resizable:
      return WindowsManagerConstants.STYLE_MASK_RESIZABLE;
    case WindowStyleMask.UnifiedTitleAndToolbar:
      return WindowsManagerConstants.STYLE_MASK_UNIFIED_TITLE_AND_TOOLBAR;
    case WindowStyleMask.FullScreen:
      return WindowsManagerConstants.STYLE_MASK_FULL_SCREEN;
    case WindowStyleMask.FullSizeContentView:
      return WindowsManagerConstants.STYLE_MASK_FULL_SIZE_CONTENT_VIEW;
    case WindowStyleMask.UtilityWindow:
      return WindowsManagerConstants.STYLE_MASK_UTILITY_WINDOW;
    case WindowStyleMask.DocModalWindow:
      return WindowsManagerConstants.STYLE_MASK_DOC_MODAL_WINDOW;
    case WindowStyleMask.NonactivatingPanel:
      return WindowsManagerConstants.STYLE_MASK_NONACTIVATING_PANEL;
    default:
      return WindowsManagerConstants.STYLE_MASK_BORDERLESS;
  }
}

function convertMaskArrayToBitwiseOR(mask: WindowStyleMask[]) {
  return mask.reduce((result, mask) => result | getWindowStyleMaskValue(mask), 0);
}

function convertOptionsToNative(options?: WindowOptions): NativeWindowOptions {
  if (!options?.windowStyle?.mask) {
    return (options as NativeWindowOptions) || {};
  }

  return {
    ...options,
    windowStyle: {
      ...options.windowStyle,
      mask: convertMaskArrayToBitwiseOR(options.windowStyle.mask),
    },
  };
}

export function createWindowsNavigator<T extends WindowsConfig>(config: T) {
  Object.entries(config).forEach(([key, value]) => {
    AppRegistry.registerComponent(key, () =>
      withWindowProvider(withThemeProvider(value.component), key)
    );
  });

  return {
    open: (window: keyof T) => {
      WindowsManager?.openWindow(String(window), convertOptionsToNative(config[window].options));
    },
    close: (window: keyof T) => {
      WindowsManager?.closeWindow(String(window));
    },
  };
}
