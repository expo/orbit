import { ElectronModule } from './types';

type ReactNativeElectronModulesObject = {
  modules: {
    [moduleName: string]: ElectronModule;
  };
};

declare global {
  // eslint-disable-next-line no-var
  var __reactNativeElectronModules: ReactNativeElectronModulesObject | undefined;
}

/**
 * Imports a module registered with the given name.
 *
 * @param moduleName Name of the requested native module.
 * @returns Object representing the electron module.
 * @throws Error when there is no electron module with given name.
 */
export function requireElectronModule<ModuleType = any>(moduleName: string): ModuleType {
  const nativeModule =
    (globalThis.__reactNativeElectronModules?.modules?.[moduleName] as ModuleType) ?? null;

  if (!nativeModule) {
    throw new Error(`Cannot find electron module '${moduleName}'`);
  }
  return nativeModule;
}
