export enum WindowStyleMask {
  Borderless,
  Titled,
  Closable,
  Miniaturizable,
  Resizable,
  UnifiedTitleAndToolbar,
  FullScreen,
  FullSizeContentView,
  UtilityWindow,
  DocModalWindow,
  NonactivatingPanel,
}

export type WindowOptions = {
  title?: string;
  windowStyle?: {
    mask?: WindowStyleMask[];
    height?: number;
    width?: number;
    titlebarAppearsTransparent?: boolean;
  };
};

export type WindowsConfig = {
  [key: string]: {
    component: React.ComponentType<any>;
    options?: WindowOptions;
  };
};

export type WindowsManagerType = {
  openWindow: (window: string, options: WindowOptions) => Promise<void>;
  closeWindow(window: string): void;
};
