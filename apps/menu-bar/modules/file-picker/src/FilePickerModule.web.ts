import { NativeFilePickerModule } from './types';

const FilePickerModule: NativeFilePickerModule = {
  pickFolder() {
    return Promise.resolve('');
  },
  pickFileWithFilenameExtension() {
    return Promise.resolve('');
  },
};

export default FilePickerModule;
