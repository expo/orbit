type ElectronObject = {
  modules: any;
};

declare global {
  // eslint-disable-next-line no-var
  var electron: ElectronObject | undefined;
}

/**
 * Imports the native module registered with given name. In the first place it tries to load
 * the module installed through the JSI host object and then falls back to the bridge proxy module.
 * Notice that the modules loaded from the proxy may not support some features like synchronous functions.
 *
 * @param moduleName Name of the requested native module.
 * @returns Object representing the native module.
 * @throws Error when there is no native module with given name.
 */
export function requireElectronModule<ModuleType = any>(moduleName: string): ModuleType {
  const nativeModule = requireOptionalNativeModule<ModuleType>(moduleName);

  if (!nativeModule) {
    throw new Error(`Cannot find electron module '${moduleName}'`);
  }
  return nativeModule;
}

/**
 * Imports the native module registered with the given name. The same as `requireNativeModule`,
 * but returns `null` when the module cannot be found instead of throwing an error.
 *
 * @param moduleName Name of the requested native module.
 * @returns Object representing the native module or `null` when it cannot be found.
 */
export function requireOptionalNativeModule<ModuleType = any>(
  moduleName: string
): ModuleType | null {
  return globalThis.electron?.modules?.[moduleName] ?? null;
}
