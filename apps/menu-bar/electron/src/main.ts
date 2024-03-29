import { app, BrowserWindow } from 'electron';
import os from 'os';
import path from 'path';
import { registerMainModules } from 'react-native-electron-modules';

import { LocalServer } from './LocalServer';
import TrayGenerator from './TrayGenerator';
import { MainModules } from '../modules/mainRegistry';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32' && require('electron-squirrel-startup')) {
  app.quit();
}

// Use a different protocol for macos so it doesn't conflict with the react-native-macos project
const protocol = os.platform() !== 'darwin' ? 'expo-orbit' : 'orbit-debug';
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(protocol, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(protocol);
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

const createMainWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 380,
    height: 600,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
    webPreferences: {
      devTools: true,
      webSecurity: false,
      preload: path.join(__dirname, './preload.js'),
    },
    skipTaskbar: true,
  });

  const development = !app.isPackaged;
  if (development) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    mainWindow.loadURL('http://localhost:8081');
  } else {
    mainWindow.loadURL(`file://${path.join(__dirname, '../../../app/dist/index.html')}`);
  }

  return mainWindow;
};

app.on('ready', () => {
  registerMainModules(MainModules);

  const mainWindow = createMainWindow();
  const Tray = new TrayGenerator(mainWindow);
  Tray.createTray();

  const server = new LocalServer();
  server.start();
});
