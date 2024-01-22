const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const TrayGenerator = require('./TrayGenerator');
const spawnCliAsync = require('./spawnCliAsync');

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
      preload: path.join(__dirname, '../preload.js'),
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
  ipcMain.handle('runCli', async (event, command, args, listenerId) => {
    // eslint-disable-next-line no-undef
    const cliPath = path.join(__dirname, '../../../cli/build/index.js');

    const commandOutput = await spawnCliAsync(cliPath, command, args, listenerId);
    return commandOutput;
  });

  const mainWindow = createMainWindow();
  const Tray = new TrayGenerator(mainWindow);
  Tray.createTray();
});
