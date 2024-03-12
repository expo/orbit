import { EmitterSubscription } from 'react-native';
import { ElectronModule } from 'react-native-electron-modules/build/types';

export interface NativeMenuBarModule {
  readonly appVersion: string;
  readonly buildVersion: string;
  readonly initialScreenSize: { height: number; width: number };
  readonly homedir: string;
  exitApp(): void;
  openSystemSettingsLoginItems(): void;
  runCli: (command: string, args: string[], listenerId: number) => Promise<string>;
  runCommand: (command: string, args: string[]) => Promise<void>;
  setLoginItemEnabled: (enabled: boolean) => Promise<void>;
  setEnvVars: (envVars: { [key: string]: string }) => void;
  showMultiOptionAlert: (title: string, message: string, options: string[]) => Promise<number>;
  openPopover(): void;
  closePopover(): void;
}

type PreloadKeys = 'initialScreenSize' | 'closePopover' | 'openPopover';

export interface ElectronMainMenuBarModule
  extends Omit<
      NativeMenuBarModule,
      | PreloadKeys
      | 'runCli'
      | 'buildVersion'
      | 'homedir'
      | 'runCommand'
      | 'openSystemSettingsLoginItems'
    >,
    ElectronModule {
  name: string;
  runCli: (
    command: string,
    args: string[],
    listenerId: number,
    event: Electron.IpcMainInvokeEvent
  ) => Promise<string>;
}

export interface ElectronPreloadMenuBarModule extends Pick<NativeMenuBarModule, PreloadKeys> {
  name: string;
  addListener(type: string, listener: (data: any) => void): EmitterSubscription;
}
