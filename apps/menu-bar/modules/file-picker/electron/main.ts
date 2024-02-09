import { dialog } from 'electron';

import { NativeFilePickerModule } from '../src/types';

const FilePickerModule: Partial<NativeFilePickerModule> & { name: string } = {
  name: 'FilePicker',
  pickFileWithFilenameExtension: async (filenameExtensions: string[], prompt: string) => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      properties: ['openFile'],
      buttonLabel: prompt,
      filters: [{ name: 'Apps', extensions: filenameExtensions }],
    });

    if (canceled) {
      throw new Error('NSModalResponseCancel');
    }

    return filePaths[0];
  },
  pickFolder: async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    if (canceled) {
      throw new Error('NSModalResponseCancel');
    }

    return filePaths[0];
  },
};

export default FilePickerModule;
