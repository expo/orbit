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
    /**
     * Draw the window without an opaque background so the content defines its
     * shape. Used by the cloud simulator's frameless layout, where the device
     * bezel rendered by the page becomes the window outline.
     */
    transparent?: boolean;
    hasShadow?: boolean;
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
