import { contextBridge, ipcRenderer } from 'electron';

import { ElectronModule, IpcMainModulesFunctions, Registry } from './types';

export function exposeElectronModules(preloadModules: Registry) {
  const registeredModules: {
    [key: string]: ElectronModule;
  } = {};

  const ipcMainModulesFunctions: IpcMainModulesFunctions = ipcRenderer.sendSync(
    'get-all-ipc-main-functions'
  );

  // Merge preload modules with ipcMain modules
  for (const module of preloadModules) {
    registeredModules[module.name] = mergeModule(module, ipcMainModulesFunctions[module.name]);
  }

  // Register ipcMain only modules
  for (const [moduleName, ipcMainModule] of Object.entries(ipcMainModulesFunctions)) {
    if (!registeredModules[moduleName]) {
      registeredModules[moduleName] = mergeModule({ name: moduleName }, ipcMainModule);
    }
  }

  contextBridge.exposeInMainWorld('electron', { modules: registeredModules });
}

function mergeModule(
  module: ElectronModule,
  ipcMainModule: IpcMainModulesFunctions[0]
): ElectronModule {
  for (const moduleFunction of ipcMainModule.functions) {
    module[moduleFunction] = (...args: any[]) =>
      ipcRenderer.invoke(`${module.name}:${moduleFunction}`, ...args);
  }

  for (const moduleValue of ipcMainModule.values) {
    module[moduleValue] = ipcRenderer.sendSync(`${module.name}:${moduleValue}`);
  }
  return module;
}
