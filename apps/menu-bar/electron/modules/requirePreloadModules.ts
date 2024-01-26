import { IpcRenderer } from 'electron';

import { ElectronModule, IpcMainModulesFunctions } from './RegistryTypes';
import { PreloadModules } from './preloadRegistry';

export function requirePreloadModules(ipcRenderer: IpcRenderer) {
  const registeredModules: {
    [key: string]: ElectronModule;
  } = {};

  const ipcMainModulesFunctions: IpcMainModulesFunctions = ipcRenderer.sendSync(
    'get-all-ipc-main-functions'
  );

  for (const module of PreloadModules) {
    registeredModules[module.name] = mergeModule(
      module,
      ipcMainModulesFunctions[module.name],
      ipcRenderer
    );
  }

  // Register ipcMain only modules
  for (const [moduleName, ipcMainModule] of Object.entries(ipcMainModulesFunctions)) {
    if (!registeredModules[moduleName]) {
      registeredModules[moduleName] = mergeModule({ name: moduleName }, ipcMainModule, ipcRenderer);
    }
  }

  return { modules: registeredModules };
}

function mergeModule(
  module: ElectronModule,
  ipcMainModule: IpcMainModulesFunctions[0],
  ipcRenderer: IpcRenderer
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
