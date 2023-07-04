import {NativeModule, NativeModules} from 'react-native';

type FilePickerModule = NativeModule & {
  pickFileWithFilenameExtension: (extensions: string[]) => Promise<string>;
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
};
