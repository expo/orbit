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
