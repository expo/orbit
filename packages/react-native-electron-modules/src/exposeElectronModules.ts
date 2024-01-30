import { contextBridge, ipcRenderer } from 'electron';

import { ElectronModule, IpcMainModules, Registry } from './types';

export function exposeElectronModules(preloadModules: Registry) {
  const registeredModules: {
    [key: string]: ElectronModule;
  } = {};

  const ipcMainModules: IpcMainModules = ipcRenderer.sendSync('get-all-ipc-main-modules');

  // Merge preload modules with ipcMain modules
  for (const module of preloadModules) {
    registeredModules[module.name] = mergeModule(module, ipcMainModules[module.name]);
  }

  // Register ipcMain only modules
  for (const [moduleName, ipcMainModule] of Object.entries(ipcMainModules)) {
    if (!registeredModules[moduleName]) {
      registeredModules[moduleName] = mergeModule({ name: moduleName }, ipcMainModule);
    }
  }

  contextBridge.exposeInMainWorld('electron', { modules: registeredModules });
}

function mergeModule(module: ElectronModule, ipcMainModule?: IpcMainModules[0]): ElectronModule {
  if (!ipcMainModule) {
    return module;
  }

  for (const moduleFunction of ipcMainModule.functions) {
    module[moduleFunction] = (...args: any[]) =>
      ipcRenderer.invoke(`${module.name}:${moduleFunction}`, ...args);
  }

  for (const moduleValue of ipcMainModule.values) {
    module[moduleValue] = ipcRenderer.sendSync(`${module.name}:${moduleValue}`);
  }
  return module;
}
