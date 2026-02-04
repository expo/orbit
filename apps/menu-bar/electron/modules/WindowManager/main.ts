import { app, BrowserWindow } from 'electron';
import path from 'path';
import {
  WindowStyleMask,
  type WindowOptions,
  type WindowsManagerType,
} from 'react-native-multi-window';

const _windowsMap: { [key: string]: BrowserWindow } = {};

const openWindow = async (moduleName: string, options: WindowOptions) => {
  let window: BrowserWindow;

  if (_windowsMap[moduleName]) {
    window = _windowsMap[moduleName];
  } else {
    const windowStyle = options?.windowStyle || {};

    window = new BrowserWindow({
      width: windowStyle.width ?? 300,
      height: (windowStyle.height ?? 400) + (windowStyle.titlebarAppearsTransparent ? 30 : 0),
      title: options?.title ?? moduleName,
      frame: !windowStyle.mask?.includes(WindowStyleMask.FullSizeContentView),
      resizable: windowStyle.mask?.includes(WindowStyleMask.Resizable) ?? false,
      webPreferences: {
        devTools: true,
        webSecurity: false,
        preload: path.join(__dirname, './preload.js'),
      },
    });
    window.menuBarVisible = false;

    window.on('page-title-updated', function (e) {
      e.preventDefault();
    });
    window.on('close', function (_) {
      delete _windowsMap[moduleName];
    });
    _windowsMap[moduleName] = window;

    const development = !app.isPackaged;
    if (development) {
      await window.loadURL(`http://localhost:8081?moduleName=${moduleName}`);
    } else {
      await window.loadURL(
        `file://${path.join(__dirname, `./renderer/dist/index.html?moduleName=${moduleName}`)}`
      );
    }
  }

  window.webContents.send('windowFocused', moduleName);
  window.show();
};

const WindowManager: WindowsManagerType & { name: string } = {
  name: 'WindowManager',
  openWindow,
  closeWindow: (moduleName: string) => {
    const window = _windowsMap[moduleName];
    if (window) {
      window.close();
      delete _windowsMap[moduleName];
    }
  },
};

export default WindowManager;
