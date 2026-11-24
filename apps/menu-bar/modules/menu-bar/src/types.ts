import { EmitterSubscription } from 'react-native';
import { ElectronModule } from 'react-native-electron-modules/build/types';

export interface NativeMenuBarModule {
  readonly appVersion: string;
  readonly buildVersion: string;
  readonly initialScreenSize: { height: number; width: number };
  readonly homedir: string;
  exitApp(): void;
  openSystemSettingsLoginItems(): void;
  runCli: (
    command: string,
    args: string[],
    listenerId: number,
    transientEnvVars?: Record<string, string>
  ) => Promise<string>;
  runCommand: (command: string, args: string[]) => Promise<void>;
  setLoginItemEnabled: (enabled: boolean) => Promise<void>;
  setEnvVars: (envVars: { [key: string]: string }) => void;
  showMultiOptionAlert: (title: string, message: string, options: string[]) => Promise<number>;
  showMenu: (items: MenuItem[]) => Promise<number>;
  /**
   * Replaces the items of the menu that `showMenu` opened, while it is open. Only on macOS:
   * on the other platforms it does nothing, so open the menu there when the items are ready.
   */
  updateMenu: (items: MenuItem[]) => Promise<void>;
  /**
   * Shows `text` in a green badge on the menu bar icon. No text removes the badge. Only on
   * macOS: the tray icon of the other platforms has no badge.
   */
  setStatusItemBadge: (text: string | null) => Promise<void>;
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
    transientEnvVars: Record<string, string> | undefined,
    event: Electron.IpcMainInvokeEvent
  ) => Promise<string>;
}

export interface ElectronPreloadMenuBarModule extends Pick<NativeMenuBarModule, PreloadKeys> {
  name: string;
  addListener(type: string, listener: (data: any) => void): EmitterSubscription;
}

export type MenuItem = {
  title?: string;
  /** Shows after the title in a secondary color. */
  detail?: string;
  checked?: boolean;
  separator?: boolean;
  /** A title for the items below it. It cannot be chosen. */
  header?: boolean;
  /** The item shows in grey and cannot be chosen. */
  disabled?: boolean;
};
