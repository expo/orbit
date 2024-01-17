import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';

type PopoverFocusedEvent = {
  screenSize: { height: number; width: number };
};

export function usePopoverFocusEffect(callback: (event: PopoverFocusedEvent) => void) {
  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('popoverFocused', callback);

    return () => {
      listener.remove();
    };
  }, [callback]);
}
