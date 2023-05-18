import {useEffect} from 'react';
import {Linking} from 'react-native';

export type DeepLinkingCallback = (event: {url: string}) => void;

export const useDeepLinking = (callback: DeepLinkingCallback) => {
  useEffect(() => {
    Linking.getInitialURL().then(url => url && callback({url}));
    const listener = Linking.addEventListener('url', callback);

    return listener.remove;
  }, [callback]);
};
