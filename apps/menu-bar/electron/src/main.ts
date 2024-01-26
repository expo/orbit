import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

import TrayGenerator from './TrayGenerator';
import { registerMainModules } from '../modules/registerElectronModules';

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
      // eslint-disable-next-line no-undef
      preload: path.join(__dirname, './preload.js'),
    },
    skipTaskbar: true,
  });

  const development = true;
  if (development) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    mainWindow.loadURL('http://localhost:8081');
  } else {
    // eslint-disable-next-line no-undef
    mainWindow.loadURL(`file://${path.join(__dirname, '../../build/index.html')}`);
  }

  return mainWindow;
};

app.on('ready', () => {
  registerMainModules(ipcMain);

  const mainWindow = createMainWindow();
  const Tray = new TrayGenerator(mainWindow);
  Tray.createTray();
});
