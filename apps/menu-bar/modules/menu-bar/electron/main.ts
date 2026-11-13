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
    ensureDir: true,
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

// A menu that closes with no choice is a cancel. The order of the `click` of an item and the
// close callback of the menu is not sure, so the cancel waits: a `click` settles the promise
// first, and the later cancel then does nothing.
const MENU_CANCEL_DELAY_MS = 250;

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
      Menu.buildFromTemplate(
        options.map((label, index) => ({ label, click: () => resolve(index) }))
      ).popup({
        callback: () => setTimeout(() => reject(new Error('Cancelled')), MENU_CANCEL_DELAY_MS),
      });
    });
  },
  showMenu: (items) =>
    new Promise<number>((resolve) => {
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
                  enabled: !item.disabled,
                  click: () => resolve(index),
                }
        )
      ).popup({
        callback: () => setTimeout(() => resolve(-1), MENU_CANCEL_DELAY_MS),
      });
    }),
  // An Electron menu cannot change while it is open.
  updateMenu: async () => {},
  // The tray icon has no badge.
  setStatusItemBadge: async () => {},
  setEnvVars(envVars) {
    const userSettingsJsonFile = getUserSettingsJsonFile();
    userSettingsJsonFile.setAsync('envVars', envVars);
  },
};

export default MenuBarModule;
