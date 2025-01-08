import { useEffect } from 'react';

import FileHandler from '../../../modules/file-handler';

export type UseFileHandlerParams = {
  onOpenFile: (path: string) => void;
};

export const useFileHandler = ({ onOpenFile }: UseFileHandlerParams) => {
  useEffect(() => {
    const listener = FileHandler.addListener('onOpenFile', ({ path }) => {
      onOpenFile(path);
    });

    return listener.remove;
  }, [onOpenFile]);
};
