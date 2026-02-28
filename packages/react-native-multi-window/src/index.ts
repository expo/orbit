import { AppRegistry, NativeModules } from 'react-native';

import { WindowOptions, WindowStyleMask, WindowsConfig, WindowsManagerType } from './types';

export { WindowStyleMask } from './types';
export type { WindowOptions, WindowsConfig, WindowsManagerType } from './types';
export { WindowProvider, withWindowProvider, useWindowId } from './WindowProvider';
export { useWindowFocusEffect } from './useWindowFocus';

type NativeWindowOptions = Omit<WindowOptions, 'windowStyle'> & {
  windowStyle?: Omit<WindowOptions['windowStyle'], 'mask'> & {
    mask?: number;
  };
};

type NativeWindowsManagerType = WindowsManagerType & {
  openWindow: (window: string, options: NativeWindowOptions) => Promise<void>;
};

const RNMultiWindow: NativeWindowsManagerType = NativeModules.RNMultiWindow;
const RNMultiWindowConstants = NativeModules.RNMultiWindow?.getConstants?.() ?? {};

function getWindowStyleMaskValue(mask: WindowStyleMask) {
  switch (mask) {
    case WindowStyleMask.Borderless:
      return RNMultiWindowConstants.STYLE_MASK_BORDERLESS;
    case WindowStyleMask.Titled:
      return RNMultiWindowConstants.STYLE_MASK_TITLED;
    case WindowStyleMask.Closable:
      return RNMultiWindowConstants.STYLE_MASK_CLOSABLE;
    case WindowStyleMask.Miniaturizable:
      return RNMultiWindowConstants.STYLE_MASK_MINIATURIZABLE;
    case WindowStyleMask.Resizable:
      return RNMultiWindowConstants.STYLE_MASK_RESIZABLE;
    case WindowStyleMask.UnifiedTitleAndToolbar:
      return RNMultiWindowConstants.STYLE_MASK_UNIFIED_TITLE_AND_TOOLBAR;
    case WindowStyleMask.FullScreen:
      return RNMultiWindowConstants.STYLE_MASK_FULL_SCREEN;
    case WindowStyleMask.FullSizeContentView:
      return RNMultiWindowConstants.STYLE_MASK_FULL_SIZE_CONTENT_VIEW;
    case WindowStyleMask.UtilityWindow:
      return RNMultiWindowConstants.STYLE_MASK_UTILITY_WINDOW;
    case WindowStyleMask.DocModalWindow:
      return RNMultiWindowConstants.STYLE_MASK_DOC_MODAL_WINDOW;
    case WindowStyleMask.NonactivatingPanel:
      return RNMultiWindowConstants.STYLE_MASK_NONACTIVATING_PANEL;
    default:
      return RNMultiWindowConstants.STYLE_MASK_BORDERLESS;
  }
}

function convertMaskArrayToBitwiseOR(mask: WindowStyleMask[]) {
  return mask.reduce((result, m) => result | getWindowStyleMaskValue(m), 0);
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

export function createWindowsNavigator<T extends WindowsConfig>(
  config: T,
  wrapComponent: (component: React.ComponentType<any>, id: string) => React.ComponentType<any>
) {
  Object.entries(config).forEach(([key, value]) => {
    AppRegistry.registerComponent(key, () => wrapComponent(value.component, key));
  });

  return {
    open: (window: keyof T) => {
      RNMultiWindow?.openWindow(String(window), convertOptionsToNative(config[window].options));
    },
    close: (window: keyof T) => {
      RNMultiWindow?.closeWindow(String(window));
    },
  };
}
