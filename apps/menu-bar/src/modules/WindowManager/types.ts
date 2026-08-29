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
    /**
     * Electron only. Enables the <webview> tag for this window. Off by default:
     * it changes the renderer's process model, and enabling it on every window
     * made destroying the Onboarding window hang on Linux.
     */
    webviewTag?: boolean;
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
