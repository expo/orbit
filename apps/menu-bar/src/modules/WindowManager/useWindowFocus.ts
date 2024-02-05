import { useEffect } from 'react';

import { useWindowId } from './WindowProvider';
import { DeviceEventEmitter } from '../DeviceEventEmitter';

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
