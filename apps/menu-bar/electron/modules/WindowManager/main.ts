import { app, BrowserWindow } from 'electron';
import path from 'path';

import { WindowOptions, WindowStyleMask } from '../../../src/modules/WindowManager/types';

const _windowsMap: { [key: string]: BrowserWindow } = {};

const openWindow = async (moduleName: string, options: WindowOptions) => {
  let window: BrowserWindow;

  if (_windowsMap[moduleName]) {
    window = _windowsMap[moduleName];
  } else {
    const windowStyle = options?.windowStyle || {};

    window = new BrowserWindow({
      width: windowStyle.width ?? 300,
      height: windowStyle.height ?? 400,
      title: options?.title ?? moduleName,
      frame: !windowStyle.mask?.includes(WindowStyleMask.FullSizeContentView),
      resizable: windowStyle.mask?.includes(WindowStyleMask.Resizable) ?? false,
      webPreferences: {
        devTools: true,
        webSecurity: false,
        preload: path.join(__dirname, '../../.vite/build/preload.js'),
      },
    });
    window.menuBarVisible = false;

    window.on('page-title-updated', function (e) {
      e.preventDefault();
    });
    window.on('close', function (e) {
      delete _windowsMap[moduleName];
    });
    _windowsMap[moduleName] = window;

    const development = !app.isPackaged;
    if (development) {
      await window.loadURL(`http://localhost:8081?moduleName=${moduleName}`);
    } else {
      await window.loadURL(
        `file://${path.join(__dirname, `../../build/index.html?moduleName=${moduleName}`)}`
      );
    }
  }

  window.webContents.send('windowFocused', moduleName);
  window.show();
};

const WindowManager = {
  name: 'WindowManager',
  openWindow,
};

export default WindowManager;
