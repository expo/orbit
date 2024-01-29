import { ipcMain } from 'electron';

import { ElectronModule, IpcMainModulesFunctions, Registry } from './types';

const ipcMainModuleFunctions: IpcMainModulesFunctions = {};

export function registerMainModules(modules: Registry) {
  modules.forEach((module) => {
    registerMainModule(module);
  });

  ipcMain.on('get-all-ipc-main-functions', (event) => {
    event.returnValue = ipcMainModuleFunctions;
  });
}

function registerMainModule(module: ElectronModule) {
  ipcMainModuleFunctions[module.name] = { functions: [], values: [] };

  Object.entries(module).forEach(([key, value]) => {
    const moduleFunctionKey = `${module.name}:${key}`;
    if (typeof value === 'function') {
      // Adds a handler for an invokeable IPC
      ipcMain.handle(moduleFunctionKey, (_, ...args) => value(...args));
      ipcMainModuleFunctions[module.name].functions.push(key);
    } else {
      // No need to add a handler for the module name
      if (key === 'name') return;

      ipcMain.once(moduleFunctionKey, (event) => {
        event.returnValue = value;
      });
      ipcMainModuleFunctions[module.name].values.push(key);
    }
  });
}
