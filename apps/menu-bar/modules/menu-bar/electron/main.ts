import JsonFile from '@expo/json-file';
import { StorageUtils } from 'common-types';
import { app, dialog, BrowserWindow } from 'electron';
import os from 'os';
import path from 'path';

import spawnCliAsync from './spawnCliAsync';
import { ElectronMainMenuBarModule } from '../src/types';

function getUserSettingsJsonFile() {
  return new JsonFile<StorageUtils.UserSettingsData>(StorageUtils.userSettingsFile(os.homedir()), {
    jsonParseErrorDefault: {},
    cantReadFileDefault: {},
  });
}

const runCli = async (
  command: string,
  args: string[],
  listenerId: number,
  event: Electron.IpcMainInvokeEvent
) => {
  const webContents = BrowserWindow.getAllWindows().find(
    (window) => window.webContents === event.sender
  )?.webContents;

  const cliPath = path.join(__dirname, './cli/index.js');

  const userSettingsJsonFile = getUserSettingsJsonFile();
  const { envVars } = await userSettingsJsonFile.readAsync();
  const commandOutput = await spawnCliAsync(
    cliPath,
    command,
    args,
    listenerId,
    envVars,
    (event) => {
      webContents?.postMessage('onCLIOutput', event);
    }
  );
  return commandOutput;
};

const MenuBarModule: ElectronMainMenuBarModule = {
  name: 'MenuBar',
  appVersion: app.getVersion(),
  runCli,
  exitApp() {
    app.quit();
  },
  setLoginItemEnabled(enabled: boolean) {
    app.setLoginItemSettings({ openAtLogin: enabled });
    return Promise.resolve();
  },
  showMultiOptionAlert: async (title: string, message: string, options: string[]) => {
    const { response } = await dialog.showMessageBox({
      title,
      message: title,
      detail: message,
      type: 'question',
      buttons: ['Cancel', 'OK'],
    });

    return response;
  },
  setEnvVars(envVars) {
    const userSettingsJsonFile = getUserSettingsJsonFile();
    userSettingsJsonFile.setAsync('envVars', envVars);
  },
};

export default MenuBarModule;
