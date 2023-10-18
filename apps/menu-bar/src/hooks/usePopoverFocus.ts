import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';

export function usePopoverFocusEffect(callback: () => void) {
  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('popoverFocused', callback);

    return () => {
      listener.remove();
    };
  }, [callback]);
}
