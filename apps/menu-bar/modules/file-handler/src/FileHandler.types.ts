export type FileHandlerModuleEvents = {
  onOpenFile: (response: { path: string }) => void;
};
