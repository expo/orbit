import {NativeModule, NativeModules} from 'react-native';

type FilePickerModule = NativeModule & {
  pickFileWithFilenameExtension: (extensions: string[]) => Promise<string>;
  pickFolder: () => Promise<string>;
};

const FilePickerModule: FilePickerModule = NativeModules.FilePicker;

export default {
  ...FilePickerModule,
  getAppAsync: async () => {
    return await FilePickerModule.pickFileWithFilenameExtension([
      'apk',
      'gzip',
      'ipa',
    ]);
  },
  pickFolder: async () => FilePickerModule.pickFolder(),
};
