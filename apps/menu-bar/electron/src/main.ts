import { spawnSync } from 'child_process';
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
  // The `orbit` command's launcher points into the app folder that Squirrel is about to delete,
  // so remove it and its user PATH entry too.
  if (process.argv[1] === '--squirrel-uninstall') {
    spawnSync(
      process.execPath,
      [path.join(__dirname, './cli/index.js'), 'uninstall-shell-command'],
      { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } }
    );
  }
  app.quit();
}

// The bundled CLI resolves the native helper binaries (anisette/zsign) relative
// to its own location, which only works in dev. In a packaged build they ship as
// an extraResource (outside the asar so they stay executable), so point
// ipa-resign at that location. Forked CLI processes inherit this via env.
if (app.isPackaged) {
  process.env.ORBIT_HELPER_BIN_DIR = path.join(process.resourcesPath, 'bin');
}

// The Win/Linux anisette provider is the anisette-js WASM emulator, whose assets
// (assets/anisette/, copied into electron/anisette/ by build-helpers) it loads at
// runtime. ipa-resign is bundled into the CLI, so it can't find them relative to
// its own dir — point it at the shipped copy. Packaged: <resources>/anisette;
// dev: electron/anisette. Forked CLI processes inherit this via env.
process.env.ORBIT_ANISETTE_ASSETS_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'anisette')
  : path.join(app.getAppPath(), 'anisette');

// On Windows/Linux, re-sign IPAs with ipa-resign's in-process WASM signer instead
// of the native zsign binary. The WASM signer ships inside the ipa-resign package
// (no binary to build, bundle, or extract from the asar), so packaged builds can
// re-sign with no extra setup or toolchain. macOS keeps the native zsign binary.
// Forked CLI processes inherit this via env.
if (process.platform !== 'darwin') {
  process.env.APPLE_RESIGN_SIGNER = 'wasm';
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

  // wdio-electron-service IPC-Bridge hook. Required by the E2E worker's
  // copyOriginalApi step. Loaded AFTER the BrowserWindow is created so the
  // hook's `app.whenReady().then(...)` fast-copy iteration of every Electron
  // API doesn't sit in front of window creation on the ready-event queue and
  // starve Chromium of the time it needs to write DevToolsActivePort.
  // See wdio-hook.ts for why this goes through a static-import shim.
  if (process.env.WDIO_E2E === '1') {
    import('./wdio-hook');
  }
});
