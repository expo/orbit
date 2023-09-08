import { useEffect } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';

const FileHandlerManager = NativeModules.FileHandlerManager;
const emitter = new NativeEventEmitter(FileHandlerManager);

type UseFileHandlerParams = {
  onOpenFile: (path: string) => void;
};

export const useFileHandler = ({ onOpenFile }: UseFileHandlerParams) => {
  useEffect(() => {
    const listener = emitter.addListener('onOpenFile', (path: string) => {
      onOpenFile(path);
    });

    return listener.remove;
  }, [onOpenFile]);
};
