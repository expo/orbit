import { app, dialog } from 'electron';
import path from 'path';

import spawnCliAsync from './spawnCliAsync';
import { NativeMenuBarModule } from '../src/types';

const runCli = async (command: string, args: string[], listenerId: number) => {
  const cliPath = path.join(__dirname, '../../../../cli/build/index.js');

  const commandOutput = await spawnCliAsync(cliPath, command, args, listenerId);
  return commandOutput;
};

const MenuBarModule: Partial<NativeMenuBarModule> & { name: string } = {
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
};

export default MenuBarModule;
