import {AppRegistry, NativeModule, NativeModules} from 'react-native';

type WindowsManager = NativeModule & {
  openWindow: (window: string, options: WindowOptions) => Promise<void>;
};
const WindowsManager: WindowsManager = NativeModules.WindowsManager;

const WindowsManagerConstants = NativeModules.WindowsManager.getConstants();

export enum WindowStyleMask {
  Borderless = WindowsManagerConstants.STYLE_MASK_BORDERLESS,
  Titled = WindowsManagerConstants.STYLE_MASK_TITLED,
  Closable = WindowsManagerConstants.STYLE_MASK_CLOSABLE,
  Miniaturizable = WindowsManagerConstants.STYLE_MASK_MINIATURIZABLE,
  Resizable = WindowsManagerConstants.STYLE_MASK_RESIZABLE,
  UnifiedTitleAndToolbar = WindowsManagerConstants.STYLE_MASK_UNIFIED_TITLE_AND_TOOLBAR,
  FullScreen = WindowsManagerConstants.STYLE_MASK_FULL_SCREEN,
  FullSizeContentView = WindowsManagerConstants.STYLE_MASK_FULL_SIZE_CONTENT_VIEW,
  UtilityWindow = WindowsManagerConstants.STYLE_MASK_UTILITY_WINDOW,
  DocModalWindow = WindowsManagerConstants.STYLE_MASK_DOC_MODAL_WINDOW,
  NonactivatingPanel = WindowsManagerConstants.STYLE_MASK_NONACTIVATING_PANEL,
}

type WindowOptions = {
  title?: string;
  windowStyle?: {
    mask?: WindowStyleMask;
    height?: number;
    width?: number;
    titlebarAppearsTransparent?: boolean;
  };
};

type WindowsConfig = {
  [key: string]: {
    component: React.ComponentType<any>;
    options?: WindowOptions;
  };
};

export function createWindowsNavigator<T extends WindowsConfig>(config: T) {
  Object.entries(config).forEach(([key, value]) => {
    AppRegistry.registerComponent(key, () => value.component);
  });

  return {
    open: (window: keyof T) => {
      const options = config[window].options || {};
      WindowsManager.openWindow(String(window), options);
    },
  };
}
