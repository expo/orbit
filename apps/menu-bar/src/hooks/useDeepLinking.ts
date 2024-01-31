import { useEffect, useState } from 'react';

import { Linking } from '../modules/Linking';

export type DeepLinkingCallback = (event: { url: string }) => void;

export const useDeepLinking = (callback: DeepLinkingCallback) => {
  const [initialURL, setInitialURL] = useState<string | null>(null);

  useEffect(() => {
    Linking.getInitialURL().then(setInitialURL);
  }, []);

  if (initialURL) {
    callback({ url: initialURL });
    setInitialURL(null);
  }

  useEffect(() => {
    const listener = Linking.addEventListener('url', callback);

    return listener.remove;
  }, [callback]);
};
