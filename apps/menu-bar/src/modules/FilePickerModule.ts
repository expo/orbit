import { NativeModule, NativeModules } from 'react-native';

type FilePickerModuleType = NativeModule & {
  pickFileWithFilenameExtension: (extensions: string[], prompt?: string) => Promise<string>;
  pickFolder: () => Promise<string>;
};

const FilePickerModule: FilePickerModuleType = NativeModules.FilePicker;

export default {
  ...FilePickerModule,
  getAppAsync: () => {
    return FilePickerModule.pickFileWithFilenameExtension(
      ['apk', 'app', 'gzip', 'ipa', 'tar'],
      'Select'
    );
  },
  pickFolder: async () => FilePickerModule.pickFolder(),
};
