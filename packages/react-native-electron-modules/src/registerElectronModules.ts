import { ipcMain } from 'electron';

import { ElectronModule, IpcMainModules, Registry } from './types';

const ipcMainModules: IpcMainModules = {};

export function registerMainModules(modules: Registry) {
  modules.forEach((module) => {
    registerMainModule(module);
  });

  ipcMain.on('get-all-ipc-main-modules', (event) => {
    event.returnValue = ipcMainModules;
  });
}

function registerMainModule(module: ElectronModule) {
  ipcMainModules[module.name] = { functions: [], values: [] };

  Object.entries(module).forEach(([key, value]) => {
    const moduleFunctionKey = `${module.name}:${key}`;
    if (typeof value === 'function') {
      // Adds a handler for an invokeable IPC and send IpcMainInvokeEvent as the last argument
      ipcMain.handle(moduleFunctionKey, (event, ...args) => value(...args, event));
      ipcMainModules[module.name].functions.push(key);
    } else {
      // No need to add a handler for the module name
      if (key === 'name') return;

      ipcMain.on(moduleFunctionKey, (event) => {
        event.returnValue = value;
      });
      ipcMainModules[module.name].values.push(key);
    }
  });
}
