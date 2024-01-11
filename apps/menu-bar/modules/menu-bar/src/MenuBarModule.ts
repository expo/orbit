import { requireNativeModule } from 'expo-modules-core';
import { NativeModule } from 'react-native';

interface NativeMenuBarModule extends NativeModule {
  readonly appVersion: string;
  readonly buildVersion: string;
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

export default requireNativeModule<NativeMenuBarModule>('MenuBar');
