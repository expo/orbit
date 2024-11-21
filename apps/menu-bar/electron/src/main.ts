import { app, BrowserWindow, protocol } from 'electron';
import started from 'electron-squirrel-startup';
import os from 'os';
import path from 'path';
import { registerMainModules } from 'react-native-electron-modules';

import { LocalServer } from './LocalServer';
import TrayGenerator from './TrayGenerator';
import { MainModules } from '../modules/mainRegistry';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32' && started) {
  app.quit();
}

// Use a different protocol for macos so it doesn't conflict with the react-native-macos project
const scheme = os.platform() !== 'darwin' ? 'expo-orbit' : 'orbit-debug';
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(scheme, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(scheme);
}

protocol.registerSchemesAsPrivileged([
  { scheme, privileges: { standard: true, supportFetchAPI: true, secure: true } },
]);

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
    mainWindow.loadURL(`file://${path.join(__dirname, `./renderer/dist/index.html`)}`);
  }

  mainWindow.webContents.once('dom-ready', () => {
    // Only keep the current session in the logs
    mainWindow.webContents.executeJavaScript("localStorage.setItem('logs', '[]')");
  });

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
