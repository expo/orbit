import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';

import { useWindowId } from './WindowProvider';

export function useWindowFocusEffect(callback: () => void) {
  const windowId = useWindowId();

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('windowFocused', (focusedWindowId: string) => {
      if (focusedWindowId === windowId) {
        callback();
      }
    });

    return () => {
      listener.remove();
    };
  }, [callback, windowId]);
}
