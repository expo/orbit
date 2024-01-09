import FilePickerModule from './src/FilePickerModule';

export function pickFolder(): Promise<string> {
  return FilePickerModule.pickFolder();
}

export function getAppAsync(): Promise<string> {
  return FilePickerModule.pickFileWithFilenameExtension(
    ['apk', 'app', 'gzip', 'ipa', 'tar'],
    'Select'
  );
}
