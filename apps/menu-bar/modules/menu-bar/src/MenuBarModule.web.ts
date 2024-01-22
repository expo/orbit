import { NativeMenuBarModule } from './types';

declare global {
  // eslint-disable-next-line no-var
  var screen: { height: number; width: number } | null | undefined;
}

const MenuBarModule: NativeMenuBarModule = {
  appVersion: '',
  buildVersion: '',
  initialScreenSize: {
    height: globalThis.screen?.height || 0,
    width: globalThis.screen?.width || 0,
  },
  homedir: '',
  exitApp() {},
  openSystemSettingsLoginItems() {},
  runCli: (command: string, args: string[], listenerId: number) => {
    return Promise.resolve('');
  },
  runCommand(command: string, args: string[]) {
    return Promise.resolve();
  },
  setLoginItemEnabled(enabled: boolean) {
    return Promise.resolve();
  },
  setEnvVars: (envVars: { [key: string]: string }) => {},
  showMultiOptionAlert: (title: string, message: string, options: string[]) => {
    return Promise.resolve(0);
  },
  openPopover() {},
  closePopover() {},
};

export default MenuBarModule;
