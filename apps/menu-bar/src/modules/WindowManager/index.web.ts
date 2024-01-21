import { WindowsConfig } from './types';

export { WindowStyleMask } from './types';

export function createWindowsNavigator<T extends WindowsConfig>(config: T) {
  return {
    open: (window: keyof T) => {},
    close: (window: keyof T) => {},
  };
}
