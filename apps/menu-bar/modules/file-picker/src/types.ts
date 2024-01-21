export interface NativeFilePickerModule {
  pickFolder(): Promise<string>;
  pickFileWithFilenameExtension(filenameExtensions: string[], prompt: string): Promise<string>;
}
