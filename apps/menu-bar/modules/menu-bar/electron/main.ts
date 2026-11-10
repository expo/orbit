import JsonFile from '@expo/json-file';
import { StorageUtils } from 'common-types';
import { app, dialog, BrowserWindow, Menu } from 'electron';
import os from 'os';
import path from 'path';

import spawnCliAsync from './spawnCliAsync';
import { ElectronMainMenuBarModule } from '../src/types';

export function getUserSettingsJsonFile() {
  return new JsonFile<StorageUtils.UserSettingsData>(StorageUtils.userSettingsFile(os.homedir()), {
    jsonParseErrorDefault: {},
    cantReadFileDefault: {},
  });
}

const runCli = async (
  command: string,
  args: string[],
  listenerId: number,
  transientEnvVars: Record<string, string> | undefined,
  event: Electron.IpcMainInvokeEvent
) => {
  const webContents = BrowserWindow.getAllWindows().find(
    (window) => window.webContents === event.sender
  )?.webContents;

  const cliPath = path.join(__dirname, './cli/index.js');

  const userSettingsJsonFile = getUserSettingsJsonFile();
  const { envVars } = await userSettingsJsonFile.readAsync();
  const mergedEnvVars = { ...envVars, ...(transientEnvVars ?? {}) };
  const commandOutput = await spawnCliAsync(
    cliPath,
    command,
    args,
    listenerId,
    mergedEnvVars,
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
  // Resolves with the index of the chosen option, and rejects on Cancel, as the macOS module
  // does. Electron has no dialog with a list, so the options show in a menu after the message.
  showMultiOptionAlert: async (title: string, message: string, options: string[]) => {
    const { response } = await dialog.showMessageBox({
      title,
      message: title,
      detail: message,
      type: 'question',
      buttons: ['Cancel', 'Choose…'],
      defaultId: 1,
      cancelId: 0,
    });
    if (response !== 1) {
      throw new Error('Cancelled');
    }

    return await new Promise<number>((resolve, reject) => {
      let chosen: number | undefined;
      Menu.buildFromTemplate(
        options.map((label, index) => ({
          label,
          click: () => {
            chosen = index;
          },
        }))
      ).popup({
        // `click` runs before the menu's close callback.
        callback: () => (chosen === undefined ? reject(new Error('Cancelled')) : resolve(chosen)),
      });
    });
  },
  showMenu: (items) =>
    new Promise<number>((resolve) => {
      let chosen = -1;
      Menu.buildFromTemplate(
        items.map((item, index) =>
          item.separator
            ? { type: 'separator' as const }
            : item.header
              ? { label: item.title ?? '', enabled: false }
              : {
                  label: item.detail ? `${item.title} · ${item.detail}` : (item.title ?? ''),
                  type: 'checkbox' as const,
                  checked: !!item.checked,
                  click: () => {
                    chosen = index;
                  },
                }
        )
      ).popup({
        // `click` runs before the menu's close callback.
        callback: () => resolve(chosen),
      });
    }),
  setEnvVars(envVars) {
    const userSettingsJsonFile = getUserSettingsJsonFile();
    userSettingsJsonFile.setAsync('envVars', envVars);
  },
};

export default MenuBarModule;
